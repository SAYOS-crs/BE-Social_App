"use strict";
// create user collection steps
// 1. create User interface
// 2. create the user schema of mongose and use the user interface in the generic schema instance
// 3. create virsals of username
// 4. assign the the schema in mongoose
// 5. implement the save option assign
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const Utils_1 = require("../../Utils");
const UserSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    // Email
    Email: {
        type: String,
        required: true,
        unique: true,
    },
    confirmEmail: Date,
    // password
    Password: {
        type: String,
        required: true,
    },
    confirmPassword: {
        type: String,
    },
    //phone + address
    phone: {
        type: String,
    },
    address: {
        type: String,
        required: true,
    },
    // images
    UserImage: String,
    CoverImage: String,
    //Enums
    Gender: {
        type: String,
        enum: Utils_1.Enums.Gender,
        default: Utils_1.Enums.Gender.Male,
    },
    Rolle: {
        type: String,
        enum: Utils_1.Enums.Rolle,
        default: Utils_1.Enums.Rolle.User,
    },
    //
    Providers: {
        type: String,
        enum: Utils_1.Enums.Providers,
        default: Utils_1.Enums.Providers.System,
    },
    ChangeCradintials: Date,
}, {
    collection: "User_Collection",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
UserSchema.virtual("username")
    .set(function (value) {
    const [firstName, lastName] = value.split(" ");
    this.set({ firstName, lastName });
})
    .get(function () {
    return `${this.firstName} ${this.lastName}`;
});
const UserModel = mongoose_1.default.model("User", UserSchema);
exports.default = UserModel;
