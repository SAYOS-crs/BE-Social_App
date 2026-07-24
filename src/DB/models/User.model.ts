// create user collection steps
// 1. create User interface
// 2. create the user schema of mongose and use the user interface in the generic schema instance
// 3. create virsals of username
// 4. assign the the schema in mongoose
// 5. implement the save option assign

import mongoose, { Schema } from "mongoose";
import { Enums } from "../../Utils";

export interface IUser {
  // name

  id?: string;
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
  CoverImage?: string;

  // role + gender
  Gender: Enums.Gender;
  Rolle: Enums.Rolle;
  // provider
  Providers: Enums.Providers;
  // timestamp
  ChangeCradintials?: Date;
  CreatedAt: Date;
  UpdatedAt?: Date;
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
    CoverImage: String,
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
  },
  {
    collection: "User_Collection",
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.virtual("username")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ");
    this.set({ firstName, lastName });
  })
  .get(function () {
    return `${this.firstName} ${this.lastName}`;
  });

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
export type HUserDocument = mongoose.HydratedDocument<IUser>;
