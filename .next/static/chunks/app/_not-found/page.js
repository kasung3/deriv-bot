(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["app/_not-found/page"],{

/***/ "(app-pages-browser)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=%2Fopt%2Fhostedapp%2Fnode%2Froot%2Fapp%2Fnode_modules%2Fnext%2Fdist%2Fclient%2Fcomponents%2Fnot-found-error.js&page=%2F_not-found%2Fpage!":
/*!***********************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=%2Fopt%2Fhostedapp%2Fnode%2Froot%2Fapp%2Fnode_modules%2Fnext%2Fdist%2Fclient%2Fcomponents%2Fnot-found-error.js&page=%2F_not-found%2Fpage! ***!
  \***********************************************************************************************************************************************************************************************************************************************************************************/
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {


    (window.__NEXT_P = window.__NEXT_P || []).push([
      "/_not-found/page",
      function () {
        return __webpack_require__(/*! ../../../../opt/hostedapp/node/root/app/node_modules/next/dist/client/components/not-found-error.js */ "(app-pages-browser)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/client/components/not-found-error.js");
      }
    ]);
    if(true) {
      module.hot.dispose(function () {
        window.__NEXT_P.push(["/_not-found/page"])
      });
    }
  

/***/ }),

/***/ "(app-pages-browser)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/client/components/not-found-error.js":
/*!***********************************************************************************************************!*\
  !*** ../../../../opt/hostedapp/node/root/app/node_modules/next/dist/client/components/not-found-error.js ***!
  \***********************************************************************************************************/
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", ({
    value: true
}));
Object.defineProperty(exports, "default", ({
    enumerable: true,
    get: function() {
        return NotFound;
    }
}));
const _interop_require_default = __webpack_require__(/*! @swc/helpers/_/_interop_require_default */ "(app-pages-browser)/../../../../opt/hostedapp/node/root/app/node_modules/@swc/helpers/esm/_interop_require_default.js");
const _jsxruntime = __webpack_require__(/*! react/jsx-runtime */ "(app-pages-browser)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/compiled/react/jsx-runtime.js");
const _react = /*#__PURE__*/ _interop_require_default._(__webpack_require__(/*! react */ "(app-pages-browser)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/compiled/react/index.js"));
const styles = {
    error: {
        // https://github.com/sindresorhus/modern-normalize/blob/main/modern-normalize.css#L38-L52
        fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
        height: "100vh",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
    },
    desc: {
        display: "inline-block"
    },
    h1: {
        display: "inline-block",
        margin: "0 20px 0 0",
        padding: "0 23px 0 0",
        fontSize: 24,
        fontWeight: 500,
        verticalAlign: "top",
        lineHeight: "49px"
    },
    h2: {
        fontSize: 14,
        fontWeight: 400,
        lineHeight: "49px",
        margin: 0
    }
};
function NotFound() {
    return /*#__PURE__*/ (0, _jsxruntime.jsxs)(_jsxruntime.Fragment, {
        children: [
            /*#__PURE__*/ (0, _jsxruntime.jsx)("title", {
                children: "404: This page could not be found."
            }),
            /*#__PURE__*/ (0, _jsxruntime.jsx)("div", {
                style: styles.error,
                children: /*#__PURE__*/ (0, _jsxruntime.jsxs)("div", {
                    children: [
                        /*#__PURE__*/ (0, _jsxruntime.jsx)("style", {
                            dangerouslySetInnerHTML: {
                                /* Minified CSS from
                body { margin: 0; color: #000; background: #fff; }
                .next-error-h1 {
                  border-right: 1px solid rgba(0, 0, 0, .3);
                }

                @media (prefers-color-scheme: dark) {
                  body { color: #fff; background: #000; }
                  .next-error-h1 {
                    border-right: 1px solid rgba(255, 255, 255, .3);
                  }
                }
              */ __html: "body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"
                            }
                        }),
                        /*#__PURE__*/ (0, _jsxruntime.jsx)("h1", {
                            className: "next-error-h1",
                            style: styles.h1,
                            children: "404"
                        }),
                        /*#__PURE__*/ (0, _jsxruntime.jsx)("div", {
                            style: styles.desc,
                            children: /*#__PURE__*/ (0, _jsxruntime.jsx)("h2", {
                                style: styles.h2,
                                children: "This page could not be found."
                            })
                        })
                    ]
                })
            })
        ]
    });
}
_c = NotFound;
if ((typeof exports.default === "function" || typeof exports.default === "object" && exports.default !== null) && typeof exports.default.__esModule === "undefined") {
    Object.defineProperty(exports.default, "__esModule", {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=not-found-error.js.map
var _c;
$RefreshReg$(_c, "NotFound");


;
    // Wrapped in an IIFE to avoid polluting the global scope
    ;
    (function () {
        var _a, _b;
        // Legacy CSS implementations will `eval` browser code in a Node.js context
        // to extract CSS. For backwards compatibility, we need to check we're in a
        // browser context before continuing.
        if (typeof self !== 'undefined' &&
            // AMP / No-JS mode does not inject these helpers:
            '$RefreshHelpers$' in self) {
            // @ts-ignore __webpack_module__ is global
            var currentExports = module.exports;
            // @ts-ignore __webpack_module__ is global
            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;
            // This cannot happen in MainTemplate because the exports mismatch between
            // templating and execution.
            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);
            // A module can be accepted automatically based on its exports, e.g. when
            // it is a Refresh Boundary.
            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {
                // Save the previous exports signature on update so we can compare the boundary
                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)
                module.hot.dispose(function (data) {
                    data.prevSignature =
                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);
                });
                // Unconditionally accept an update to this module, we'll check if it's
                // still a Refresh Boundary later.
                // @ts-ignore importMeta is replaced in the loader
                module.hot.accept();
                // This field is set when the previous version of this module was a
                // Refresh Boundary, letting us know we need to check for invalidation or
                // enqueue an update.
                if (prevSignature !== null) {
                    // A boundary can become ineligible if its exports are incompatible
                    // with the previous exports.
                    //
                    // For example, if you add/remove/change exports, we'll want to
                    // re-execute the importing modules, and force those components to
                    // re-render. Similarly, if you convert a class component to a
                    // function, we want to invalidate the boundary.
                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {
                        module.hot.invalidate();
                    }
                    else {
                        self.$RefreshHelpers$.scheduleUpdate();
                    }
                }
            }
            else {
                // Since we just executed the code for the module, it's possible that the
                // new exports made it ineligible for being a boundary.
                // We only care about the case when we were _previously_ a boundary,
                // because we already accepted this update (accidental side effect).
                var isNoLongerABoundary = prevSignature !== null;
                if (isNoLongerABoundary) {
                    module.hot.invalidate();
                }
            }
        }
    })();


/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ var __webpack_exec__ = function(moduleId) { return __webpack_require__(__webpack_require__.s = moduleId); }
/******/ __webpack_require__.O(0, ["main-app"], function() { return __webpack_exec__("(app-pages-browser)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-client-pages-loader.js?absolutePagePath=%2Fopt%2Fhostedapp%2Fnode%2Froot%2Fapp%2Fnode_modules%2Fnext%2Fdist%2Fclient%2Fcomponents%2Fnot-found-error.js&page=%2F_not-found%2Fpage!"); });
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ _N_E = __webpack_exports__;
/******/ }
]);