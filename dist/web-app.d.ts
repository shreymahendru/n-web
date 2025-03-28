import { Container, type ComponentInstaller, type Registry } from "@nivinjoseph/n-ject";
import { type Logger } from "@nivinjoseph/n-log";
import { type ClassHierarchy } from "@nivinjoseph/n-util";
import type { RedisClientType } from "redis";
import type { ApplicationScript } from "./application-script.js";
import { Controller } from "./controller.js";
import type { ExceptionHandler } from "./exceptions/exception-handler.js";
import type { AuthenticationHandler } from "./security/authentication-handler.js";
import type { AuthorizationHandler } from "./security/authorization-handler.js";
export declare class WebApp {
    private readonly _port;
    private readonly _host;
    private readonly _koa;
    private readonly _container;
    private readonly _ownsContainer;
    private readonly _router;
    private readonly _callContextKey;
    private readonly _exceptionHandlerKey;
    private readonly _authenticationHandlerKey;
    private _hasAuthenticationHandler;
    private _authHeaders;
    private readonly _authorizationHandlerKey;
    private readonly _logger;
    private readonly _startupScriptKey;
    private _hasStartupScript;
    private readonly _shutdownScriptKey;
    private _hasShutdownScript;
    private readonly _staticFilePaths;
    private _enableCors;
    private _enableCompression;
    private _viewResolutionRoot;
    private _enableWebSockets;
    private _corsOrigin;
    private _socketServerRedisClient;
    private _socketServer;
    private readonly _disposeActions;
    private _server;
    private _isBootstrapped;
    private _shutdownManager;
    private _serverClosed;
    get containerRegistry(): Registry;
    constructor(port: number, host: string | null, container?: Container | null, logger?: Logger | null);
    enableCors(): this;
    enableCompression(): this;
    registerStaticFilePath(filePath: string, cache?: boolean, defer?: boolean): this;
    registerControllers(...controllerClasses: ReadonlyArray<ClassHierarchy<Controller>>): this;
    useInstaller(installer: ComponentInstaller): this;
    registerStartupScript(applicationScriptClass: ClassHierarchy<ApplicationScript>): this;
    registerShutdownScript(applicationScriptClass: ClassHierarchy<ApplicationScript>): this;
    registerExceptionHandler(exceptionHandlerClass: ClassHierarchy<ExceptionHandler>): this;
    registerAuthenticationHandler(authenticationHandler: ClassHierarchy<AuthenticationHandler>, ...authHeaders: Array<string>): this;
    registerAuthorizationHandler(authorizationHandler: ClassHierarchy<AuthorizationHandler>): this;
    useViewResolutionRoot(path: string): this;
    enableWebSockets(corsOrigin: string, socketServerRedisClient: RedisClientType<any, any, any>): this;
    registerDisposeAction(disposeAction: () => Promise<void>): this;
    bootstrap(): void;
    private _configureCors;
    private _configureContainer;
    private _configureStartup;
    private _configureScoping;
    private _configureCallContext;
    private _configureCompression;
    private _configureExceptionHandling;
    private _configureErrorTrapping;
    private _configureAuthentication;
    private _configureStaticFileServing;
    private _configureBodyParser;
    private _configureRouting;
    private _configureWebSockets;
    private _configureShutDown;
}
//# sourceMappingURL=web-app.d.ts.map