"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Koa = require("koa");
const KoaBodyParser = require("koa-bodyparser");
const n_ject_1 = require("@nivinjoseph/n-ject");
const n_defensive_1 = require("@nivinjoseph/n-defensive");
const router_1 = require("./router");
const n_exception_1 = require("@nivinjoseph/n-exception");
const serve = require("koa-static");
const fs = require("fs");
const path = require("path");
require("@nivinjoseph/n-ext");
const cors = require("kcors");
const default_call_context_1 = require("./services/call-context/default-call-context");
const default_authorization_handler_1 = require("./security/default-authorization-handler");
const n_sec_1 = require("@nivinjoseph/n-sec");
const default_exception_handler_1 = require("./exceptions/default-exception-handler");
const http_exception_1 = require("./exceptions/http-exception");
const n_config_1 = require("@nivinjoseph/n-config");
const webPackMiddleware = require("koa-webpack");
const n_log_1 = require("@nivinjoseph/n-log");
// public
class WebApp {
    constructor(port) {
        this._callContextKey = "CallContext";
        this._exceptionHandlerKey = "$exceptionHandler";
        this._hasExceptionHandler = false;
        this._authenticationHandlerKey = "$authenticationHandler";
        this._hasAuthenticationHandler = false;
        this._authorizationHandlerKey = "$authorizationHandler";
        this._hasAuthorizationHandler = false;
        this._staticFilePaths = new Array();
        this._enableCors = false;
        this._isBootstrapped = false;
        n_defensive_1.given(port, "port").ensureHasValue();
        this._port = port;
        this._koa = new Koa();
        this._container = new n_ject_1.Container();
        this._router = new router_1.Router(this._koa, this._container, this._authorizationHandlerKey, this._callContextKey);
    }
    enableCors() {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("enableCors");
        this._enableCors = true;
        return this;
    }
    registerStaticFilePaths(...filePaths) {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("registerStaticFilePaths");
        for (let filePath of filePaths) {
            filePath = filePath.trim().toLowerCase();
            if (filePath.startsWith("/")) {
                if (filePath.length === 1) {
                    throw new n_exception_1.ArgumentException("filePath[{0}]".format(filePath), "is root");
                }
                filePath = filePath.substr(1);
            }
            filePath = path.join(process.cwd(), filePath);
            // We skip the defensive check in dev because of webpack HMR because 
            if (n_config_1.ConfigurationManager.getConfig("env") !== "dev") {
                if (!fs.existsSync(filePath))
                    throw new n_exception_1.ArgumentException("filePath[{0}]".format(filePath), "does not exist");
            }
            if (this._staticFilePaths.some(t => t === filePath))
                throw new n_exception_1.ArgumentException("filePath[{0}]".format(filePath), "is duplicate");
            this._staticFilePaths.push(filePath);
        }
        return this;
    }
    registerControllers(...controllerClasses) {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("registerControllers");
        this._router.registerControllers(...controllerClasses);
        return this;
    }
    useInstaller(installer) {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("registerInstaller");
        n_defensive_1.given(installer, "installer").ensureHasValue();
        this._container.install(installer);
        return this;
    }
    registerExceptionHandler(exceptionHandlerClass) {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("registerExceptionHandler");
        n_defensive_1.given(exceptionHandlerClass, "exceptionHandlerClass").ensureHasValue();
        this._container.registerScoped(this._exceptionHandlerKey, exceptionHandlerClass);
        this._hasExceptionHandler = true;
        return this;
    }
    registerAuthenticationHandler(authenticationHandler) {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("registerAuthenticationHandler");
        n_defensive_1.given(authenticationHandler, "authenticationHandler").ensureHasValue();
        this._container.registerScoped(this._authenticationHandlerKey, authenticationHandler);
        this._hasAuthenticationHandler = true;
        return this;
    }
    registerAuthorizationHandler(authorizationHandler) {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("registerAuthorizationHandler");
        n_defensive_1.given(authorizationHandler, "authorizationHandler").ensureHasValue();
        this._container.registerScoped(this._authorizationHandlerKey, authorizationHandler);
        this._hasAuthorizationHandler = true;
        return this;
    }
    useViewResolutionRoot(path) {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("useViewResolutionRoot");
        n_defensive_1.given(path, "path").ensureHasValue().ensure(t => !t.isEmptyOrWhiteSpace());
        this._viewResolutionRoot = path.trim();
        return this;
    }
    enableWebPackDevMiddleware(publicPath = "/") {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("enableWebPackDevMiddleware");
        if (n_config_1.ConfigurationManager.getConfig("env") === "dev")
            this._koa.use(webPackMiddleware({
                dev: { publicPath },
                hot: { reload: true, hot: true }
            }));
        return this;
    }
    bootstrap() {
        if (this._isBootstrapped)
            throw new n_exception_1.InvalidOperationException("bootstrap");
        this.configureCors();
        this.configureContainer();
        this.configureScoping();
        this.configureCallContext();
        this.configureExceptionHandling();
        this.configureErrorTrapping();
        this.configureAuthentication();
        this.configureStaticFileServing();
        this.configureBodyParser();
        this.configureRouting(); // must be last
        this._koa.listen(this._port);
        this._isBootstrapped = true;
    }
    configureCors() {
        if (this._enableCors)
            this._koa.use(cors());
    }
    configureContainer() {
        this._container.registerScoped(this._callContextKey, default_call_context_1.DefaultCallContext);
        if (!this._hasAuthorizationHandler)
            this._container.registerScoped(this._authorizationHandlerKey, default_authorization_handler_1.DefaultAuthorizationHandler);
        if (!this._hasExceptionHandler)
            this._container.registerInstance(this._exceptionHandlerKey, new default_exception_handler_1.DefaultExceptionHandler(new n_log_1.ConsoleLogger()));
        this._container.bootstrap();
    }
    configureScoping() {
        this._koa.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            ctx.state.scope = this._container.createScope();
            yield next();
        }));
    }
    configureCallContext() {
        this._koa.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            let scope = ctx.state.scope;
            let defaultCallContext = scope.resolve(this._callContextKey);
            defaultCallContext.configure(ctx);
            yield next();
        }));
    }
    configureExceptionHandling() {
        this._koa.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield next();
            }
            catch (error) {
                if (error instanceof http_exception_1.HttpException) {
                    ctx.status = error.statusCode;
                    if (error.body !== undefined && error.body !== null)
                        ctx.body = error.body;
                    return;
                }
                let scope = ctx.state.scope;
                let exceptionHandler = scope.resolve(this._exceptionHandlerKey);
                try {
                    const result = yield exceptionHandler.handle(error);
                    ctx.body = result;
                }
                catch (exp) {
                    if (exp instanceof http_exception_1.HttpException) {
                        const httpExp = exp;
                        ctx.status = httpExp.statusCode;
                        if (httpExp.body !== undefined && httpExp.body !== null)
                            ctx.body = httpExp.body;
                    }
                    else {
                        let logMessage = "";
                        if (exp instanceof n_exception_1.Exception)
                            logMessage = exp.toString();
                        else if (exp instanceof Error)
                            logMessage = exp.stack;
                        else
                            logMessage = exp.toString();
                        console.log(Date.now(), logMessage);
                        ctx.status = 500;
                        ctx.body = "There was an error processing your request.";
                    }
                }
            }
        }));
    }
    configureErrorTrapping() {
        this._koa.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield next();
            }
            catch (error) {
                if (error instanceof Error)
                    throw error;
                throw new n_exception_1.Exception("TRAPPED ERROR | " + error.toString());
            }
        }));
    }
    configureAuthentication() {
        if (!this._hasAuthenticationHandler)
            return;
        this._koa.use((ctx, next) => __awaiter(this, void 0, void 0, function* () {
            let scope = ctx.state.scope;
            let callContext = scope.resolve(this._callContextKey);
            if (callContext.hasAuth) {
                let authenticationHandler = scope.resolve(this._authenticationHandlerKey);
                let identity = yield authenticationHandler.authenticate(callContext.authScheme, callContext.authToken);
                if (identity && identity instanceof n_sec_1.ClaimsIdentity)
                    ctx.state.identity = identity;
            }
            yield next();
        }));
    }
    configureStaticFileServing() {
        for (let path of this._staticFilePaths)
            this._koa.use(serve(path));
    }
    configureBodyParser() {
        this._koa.use(KoaBodyParser({
            strict: true,
            jsonLimit: "250mb"
        }));
    }
    configureRouting() {
        this._router.configureRouting(this._viewResolutionRoot);
    }
}
exports.WebApp = WebApp;
//# sourceMappingURL=web-app.js.map