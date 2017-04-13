import * as Koa from "koa";
import * as KoaRouter from "koa-router";
import { Container, Scope } from "n-ject";
import { given } from "n-defensive";
import { ControllerRegistration } from "./controller-registration";
import { Controller } from "./controller";
import { Exception, ApplicationException } from "n-exception";
import { Route } from "./route";
import { HttpMethods } from "./http-method";
import { HttpException } from "./http-exception";

export class Router
{
    private readonly _koa: Koa;
    private readonly _container: Container;
    private readonly _koaRouter: KoaRouter;
    private readonly _controllers = new Array<ControllerRegistration>();
    
    
    public constructor(koa: Koa, container: Container)
    {
        given(koa, "koa").ensureHasValue();
        given(container, "container").ensureHasValue();
        
        this._koa = koa;
        this._container = container;
        this._koaRouter = new KoaRouter();
    }
    
    
    public registerControllers(...controllers: Function[]): void
    {
        for (let controller of controllers)
        {
            if (this._controllers.some(t => t.controller === controller))
                throw new ApplicationException("Duplicate registration detected for Controller '{0}'."
                    .format((controller as Object).getTypeName()));

            let registration = new ControllerRegistration(controller);
            this._controllers.push(registration);
            this._container.registerScoped(registration.name, registration.controller);
        }
    }
    
    public configureRouting(): void
    {
        for (let registration of this._controllers)
        {
            switch (registration.method)
            {
                case HttpMethods.Get:
                    this.configureGet(registration);
                    break;
                case HttpMethods.Post:
                    this.configurePost(registration);
                    break;
                case HttpMethods.Put:
                    this.configurePut(registration);
                    break;
                case HttpMethods.Delete:
                    this.configureDelete(registration);
                    break;
            }
        }

        this._koa.use(this._koaRouter.routes());
        this._koa.use(this._koaRouter.allowedMethods());
    }

    private configureGet(registration: ControllerRegistration): void
    {
        this._koaRouter.get(registration.route.koaRoute, async (ctx) =>
        {
            await this.handleRequest(ctx, registration, false);
        });
    }
    
    private configurePost(registration: ControllerRegistration): void
    {
        this._koaRouter.post(registration.route.koaRoute, async (ctx) =>
        {
            await this.handleRequest(ctx, registration, true);
        });
    }

    private configurePut(registration: ControllerRegistration): void
    {
        this._koaRouter.put(registration.route.koaRoute, async (ctx) =>
        {
            await this.handleRequest(ctx, registration, true);
        });
    }

    private configureDelete(registration: ControllerRegistration): void
    {
        this._koaRouter.del(registration.route.koaRoute, async (ctx) =>
        {
            await this.handleRequest(ctx, registration, true);
        });
    }
    
    private async handleRequest(ctx: KoaRouter.IRouterContext, registration: ControllerRegistration,
        processBody: boolean): Promise<void>
    {
        let args = this.createRouteArgs(registration.route, ctx);
        
        if (processBody)
            args.push(ctx.request.body);

        let scope = ctx.state.scope as Scope;
        let controllerInstance = scope.resolve<Controller>(registration.name);
        
        ctx.body = await controllerInstance.execute(...args);
    }
    
    private createRouteArgs(route: Route, ctx: KoaRouter.IRouterContext): Array<any>
    {
        let pathParams = ctx.params ? ctx.params : {};
        let queryParams = ctx.query ? ctx.query : {};
        let model: { [index: string]: any } = {};

        for (let key in queryParams)
        {
            let routeParam = route.findRouteParam(key);
            if (!routeParam)
                continue;

            model[routeParam.paramKey] = routeParam.parseParam(queryParams[key]);
        }

        for (let key in pathParams)
        {
            let routeParam = route.findRouteParam(key);
            if (!routeParam)
                throw new HttpException(404);

            model[routeParam.paramKey] = routeParam.parseParam(pathParams[key]);
        }

        let result = [];
        for (let routeParam of route.params)
        {
            let value = model[routeParam.paramKey];
            if (value === undefined || model[routeParam.paramKey] == null)
            {
                if (!routeParam.isOptional)
                    throw new HttpException(404);

                value = null;
            }
            result.push(value);
        }

        return result;
    }
}