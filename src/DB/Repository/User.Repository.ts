import { BaseRepository } from "../DBRepository";
import UserModel, { HUserDocument, IUser } from "../models/User.model";

export default class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }
}
