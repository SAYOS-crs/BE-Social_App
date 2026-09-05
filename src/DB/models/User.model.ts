// create user collection steps
// 1. create User interface
// 2. create the user schema of mongose and use the user interface in the generic schema instance
// 3. create virsals of username
// 4. assign the the schema in mongoose
// 5. implement the save option assign

import mongoose, { Schema, Types } from "mongoose";
import { EncryptionService, Enums, HashingService } from "../../Utils";

export interface IUser {
  // name
  FCM_Token?: string[];
  id: string;
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  username?: string;
  // email
  Email: string;
  confirmEmail?: Date;
  // password
  Password: string;
  confirmPassword?: string;
  // phone + address
  phone: string;
  address: string;
  // photos
  UserImage?: string;
  CoverImage?: string[];

  // role + gender
  Gender: Enums.Gender;
  Rolle: Enums.Rolle;
  // provider
  Providers: Enums.Providers;
  // timestamp
  ChangeCradintials?: Date;
  CreatedAt: Date;
  UpdatedAt?: Date;
  isDeleted?: boolean;
}

const UserSchema = new Schema<IUser>(
  {
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
    CoverImage: [String],
    //Enums
    Gender: {
      type: String,
      enum: Enums.Gender,
      default: Enums.Gender.Male,
    },

    Rolle: {
      type: String,
      enum: Enums.Rolle,
      default: Enums.Rolle.User,
    },
    //
    Providers: {
      type: String,
      enum: Enums.Providers,
      default: Enums.Providers.System,
    },
    ChangeCradintials: Date,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    FCM_Token: {
      type: [String],
    },
  },
  {
    collection: "User_Collection",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
export type HUserDocument = mongoose.HydratedDocument<IUser>;

UserSchema.virtual("username")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ");
    this.set({ firstName, lastName });
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });
//
//
//
//
// decment middleware that hash the passowrd before save the doc.
UserSchema.pre(
  "save",
  async function (this: HUserDocument & { wasNew: boolean }) {
    this.wasNew = this.isNew;
    if (this.isModified("Password") || this.isNew) {
      this.Password = await HashingService.Hash(this.Password);
      this.phone = await EncryptionService.Encrypt(this.phone);
    }
  },
);
// UserSchema.post(
//   "save",
//   async function (this: HUserDocument & { wasNew: boolean }) {
//     const that = this;
//     if (that.wasNew) {
//       console.log(that.wasNew);
//     }
//   },
// );

// query middleware that insure the search dose not include the doc are softDeleted.
UserSchema.pre("findOne", async function () {
  this.findOne({ isDeleted: false });
});
// docment middleware that hash the password in update case + its docment middleware bcz we use { document: true }.
UserSchema.pre("updateOne", { document: true }, async function () {
  if (this.isModified("Password") && !this.isNew) {
    this.Password = await HashingService.Hash(this.Password);
  }
  if (this.isModified("phone") && !this.isNew) {
    this.phone = await EncryptionService.Encrypt(this.phone);
  }
});
const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;

// important nots :
//
// // general nots :-
// - note : _id taype of ObjectId / id type of string
// - you can active the id on the doc by id:true but it will be virtual mean you can't see it in mongoo campos
