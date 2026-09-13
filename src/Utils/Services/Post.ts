import { IUser } from "../../DB/models/User.model";
import { PostEnum } from "../Enums";

export function VisibilityQueryCheck(user: IUser) {
  return [
    { visibility: PostEnum.VisibilityEnum.Public },
    { visibility: PostEnum.VisibilityEnum.Private, CreatedBy: user.id },
    {
      visibility: PostEnum.VisibilityEnum.Friends,
      CreatedBy: { $in: [user.id, ...user.Friends] },
    },
    { tags: user.id },
  ];
}
