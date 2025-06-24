import{c as o,j as e,f as n,ax as d,av as c}from"./main-C72e0wOY.js";/**
 * @license lucide-react v0.476.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]],u=o("LoaderCircle",l);/**
 * @license lucide-react v0.476.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["polygon",{points:"3 11 22 2 13 21 11 13 3 11",key:"1ltx0t"}]],x=o("Navigation",g),v={sm:"h-4 w-4",md:"h-6 w-6",lg:"h-8 w-8",xl:"h-12 w-12"};function m({size:a="md",className:i,text:r,fullScreen:s=!1}){const t=e.jsxs("div",{className:n("flex flex-col items-center justify-center gap-2",i),children:[e.jsx(u,{className:n("animate-spin text-primary",v[a])}),r&&e.jsx("p",{className:"text-sm text-muted-foreground animate-pulse",children:r})]});return s?e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",children:t}):t}const f=c("inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",{variants:{variant:{default:"border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",secondary:"border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",destructive:"border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",outline:"text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"}},defaultVariants:{variant:"default"}});function b({className:a,variant:i,asChild:r=!1,...s}){const t=r?d:"span";return e.jsx(t,{"data-slot":"badge",className:n(f({variant:i}),a),...s})}export{b as B,u as L,x as N,m as a};
