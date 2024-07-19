import 'cookie';
import { bold, red, yellow, dim, blue } from 'kleur/colors';
import './astro/server_CbL3_bas.mjs';
import 'clsx';
import 'html-escaper';
import { compile } from 'path-to-regexp';

const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
const levels = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90
};
function log(opts, level, label, message, newLine = true) {
  const logLevel = opts.level;
  const dest = opts.dest;
  const event = {
    label,
    level,
    message,
    newLine
  };
  if (!isLogLevelEnabled(logLevel, level)) {
    return;
  }
  dest.write(event);
}
function isLogLevelEnabled(configuredLogLevel, level) {
  return levels[configuredLogLevel] <= levels[level];
}
function info(opts, label, message, newLine = true) {
  return log(opts, "info", label, message, newLine);
}
function warn(opts, label, message, newLine = true) {
  return log(opts, "warn", label, message, newLine);
}
function error(opts, label, message, newLine = true) {
  return log(opts, "error", label, message, newLine);
}
function debug(...args) {
  if ("_astroGlobalDebug" in globalThis) {
    globalThis._astroGlobalDebug(...args);
  }
}
function getEventPrefix({ level, label }) {
  const timestamp = `${dateTimeFormat.format(/* @__PURE__ */ new Date())}`;
  const prefix = [];
  if (level === "error" || level === "warn") {
    prefix.push(bold(timestamp));
    prefix.push(`[${level.toUpperCase()}]`);
  } else {
    prefix.push(timestamp);
  }
  if (label) {
    prefix.push(`[${label}]`);
  }
  if (level === "error") {
    return red(prefix.join(" "));
  }
  if (level === "warn") {
    return yellow(prefix.join(" "));
  }
  if (prefix.length === 1) {
    return dim(prefix[0]);
  }
  return dim(prefix[0]) + " " + blue(prefix.splice(1).join(" "));
}
if (typeof process !== "undefined") {
  let proc = process;
  if ("argv" in proc && Array.isArray(proc.argv)) {
    if (proc.argv.includes("--verbose")) ; else if (proc.argv.includes("--silent")) ; else ;
  }
}
class Logger {
  options;
  constructor(options) {
    this.options = options;
  }
  info(label, message, newLine = true) {
    info(this.options, label, message, newLine);
  }
  warn(label, message, newLine = true) {
    warn(this.options, label, message, newLine);
  }
  error(label, message, newLine = true) {
    error(this.options, label, message, newLine);
  }
  debug(label, ...messages) {
    debug(label, ...messages);
  }
  level() {
    return this.options.level;
  }
  forkIntegrationLogger(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
}
class AstroIntegrationLogger {
  options;
  label;
  constructor(logging, label) {
    this.options = logging;
    this.label = label;
  }
  /**
   * Creates a new logger instance with a new label, but the same log options.
   */
  fork(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
  info(message) {
    info(this.options, this.label, message);
  }
  warn(message) {
    warn(this.options, this.label, message);
  }
  error(message) {
    error(this.options, this.label, message);
  }
  debug(message) {
    debug(this.label, message);
  }
}

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getRouteGenerator(segments, addTrailingSlash) {
  const template = segments.map((segment) => {
    return "/" + segment.map((part) => {
      if (part.spread) {
        return `:${part.content.slice(3)}(.*)?`;
      } else if (part.dynamic) {
        return `:${part.content}`;
      } else {
        return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    }).join("");
  }).join("");
  let trailing = "";
  if (addTrailingSlash === "always" && segments.length) {
    trailing = "/";
  }
  const toPath = compile(template + trailing);
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    const path = toPath(sanitizedParams);
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware(_, next) {
      return next();
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes
  };
}

const manifest = deserializeManifest({"adapterName":"@astrojs/vercel/serverless","routes":[{"file":"404.html","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","isIndex":false,"route":"/404","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/@astrojs/starlight/404.astro","pathname":"/404","prerender":true,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"/_astro/page.LS5KDvwX.js"}],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["\u0000astro:content",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/404.astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:node_modules/@astrojs/starlight/404@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astrojs-ssr-virtual-entry",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/utils/routing.ts",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/index.astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:node_modules/@astrojs/starlight/index@_@astro",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/utils/navigation.ts",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/components/SidebarSublist.astro",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/components/Sidebar.astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:starlight/components/Sidebar",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/components/Page.astro",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/utils/route-data.ts",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/utils/translations.ts",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/internal.ts",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro-expressive-code/preprocess-config",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/astro-expressive-code/components/renderer.ts",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/astro-expressive-code/components/Code.astro",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/astro-expressive-code/components/index.ts",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/components.ts",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/components/Footer.astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:starlight/components/Footer",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/Cheatsheet.mdx",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/Cheatsheet.mdx?astroPropagatedAssets",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/example.mdx",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/example.mdx?astroPropagatedAssets",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/jurusan.mdx",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/jurusan.mdx?astroPropagatedAssets",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/user-components/Aside.astro",{"propagation":"in-tree","containsHead":false}],["/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/user-components/FileTree.astro",{"propagation":"in-tree","containsHead":false}]],"renderers":[],"clientDirectives":[["idle","(()=>{var i=t=>{let e=async()=>{await(await t())()};\"requestIdleCallback\"in window?window.requestIdleCallback(e):setTimeout(e,200)};(self.Astro||(self.Astro={})).idle=i;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener(\"change\",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var l=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let a of e)if(a.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=l;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astro-page:node_modules/@astrojs/starlight/404@_@astro":"pages/404.astro.mjs","\u0000@astro-page:node_modules/@astrojs/starlight/index@_@astro":"pages/_---slug_.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000noop-middleware":"_noop-middleware.mjs","\u0000@astro-renderers":"renderers.mjs","/workspaces/codespaces-blank/belajarterserah/node_modules/astro/dist/env/setup.js":"chunks/astro/env-setup_Cr6XTFvb.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/index.mdx?astroContentCollectionEntry=true":"chunks/index_CuWtfzZT.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/Cheatsheet.mdx?astroContentCollectionEntry=true":"chunks/Cheatsheet_CoDgDZTz.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/example.mdx?astroContentCollectionEntry=true":"chunks/example_C67JENzL.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/jurusan.mdx?astroContentCollectionEntry=true":"chunks/jurusan_C__eI0Za.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/index.mdx?astroPropagatedAssets":"chunks/index_Dcev1F2F.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/Cheatsheet.mdx?astroPropagatedAssets":"chunks/Cheatsheet_BPbLw3zA.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/example.mdx?astroPropagatedAssets":"chunks/example_DFTKFvtf.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/jurusan.mdx?astroPropagatedAssets":"chunks/jurusan_DwIOWATW.mjs","\u0000virtual:astro-expressive-code/config":"chunks/config_DLxf2dqb.mjs","/workspaces/codespaces-blank/belajarterserah/node_modules/astro-expressive-code/dist/index.js":"chunks/index_DaVK51eC.mjs","\u0000virtual:astro-expressive-code/preprocess-config":"chunks/preprocess-config_vt1dGPOS.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/index.mdx":"chunks/index_zLX7DwI5.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/Cheatsheet.mdx":"chunks/Cheatsheet_DRwZv70z.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/example.mdx":"chunks/example_BDMf_Y03.mjs","/workspaces/codespaces-blank/belajarterserah/src/content/docs/reference/jurusan.mdx":"chunks/jurusan_BKf537Fv.mjs","\u0000virtual:astro-expressive-code/ec-config":"chunks/ec-config_CzTTOeiV.mjs","\u0000@astrojs-manifest":"manifest_Bz0zxHAf.mjs","/astro/hoisted.js?q=0":"_astro/hoisted.DfIZDHVP.js","/workspaces/codespaces-blank/belajarterserah/node_modules/@astrojs/starlight/user-components/Tabs.astro?astro&type=script&index=0&lang.ts":"_astro/Tabs.astro_astro_type_script_index_0_lang.CCIyraCc.js","astro:scripts/page.js":"_astro/page.LS5KDvwX.js","/workspaces/codespaces-blank/belajarterserah/node_modules/@pagefind/default-ui/npm_dist/mjs/ui-core.mjs":"_astro/ui-core.Cj7PP8qz.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/ec.d6kn2.css","/_astro/ec.3zb7u.js","/_astro/buku.Cnnhq85I.png","/_astro/expert_database_banner.D0uGhFkI.jpg","/_astro/dataentry.DNWt4Igy.png","/_astro/1000_F_207156885_WFvJzDmtNSNeRMfwdukFwGyNuNypuqpH.MMAM_xU4.jpg","/_astro/banner-bg.i8_SONRz.png","/_astro/sqlbanner.DPzxJMZh.jpg","/_astro/diagramtulisan.Ck0i0xTT.png","/_astro/diagramkampus.DjdgnFaK.png","/_astro/ERDsystemonApp.CQXgBM-P.png","/_astro/diagramsql.drawio.DVsEMea-.png","/_astro/index.fw3h4_2t.css","/favicon.svg","/_astro/Tabs.astro_astro_type_script_index_0_lang.CCIyraCc.js","/_astro/hoisted.DfIZDHVP.js","/_astro/page.LS5KDvwX.js","/_astro/ui-core.Cj7PP8qz.js","/_astro/page.LS5KDvwX.js","/404.html"],"i18n":{"strategy":"pathname-prefix-other-locales","locales":["en"],"defaultLocale":"en","domainLookupTable":{}},"buildFormat":"directory","checkOrigin":false,"rewritingEnabled":false,"experimentalEnvGetSecretEnabled":false});

export { AstroIntegrationLogger as A, Logger as L, getEventPrefix as g, levels as l, manifest as m };
