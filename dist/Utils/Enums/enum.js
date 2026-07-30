"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenType = exports.Providers = exports.Rolle = exports.Gender = void 0;
var Gender;
(function (Gender) {
    Gender["Male"] = "Male";
    Gender["Female"] = "Female";
})(Gender || (exports.Gender = Gender = {}));
var Rolle;
(function (Rolle) {
    Rolle["User"] = "User";
    Rolle["Admin"] = "Admin";
})(Rolle || (exports.Rolle = Rolle = {}));
var Providers;
(function (Providers) {
    Providers["System"] = "System";
    Providers["Google"] = "Google";
    Providers["Gmail"] = "Gmail";
})(Providers || (exports.Providers = Providers = {}));
var TokenType;
(function (TokenType) {
    TokenType["Access"] = "Access";
    TokenType["Refresh"] = "Refresh";
})(TokenType || (exports.TokenType = TokenType = {}));
