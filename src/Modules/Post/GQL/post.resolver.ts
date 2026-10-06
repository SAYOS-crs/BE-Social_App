import { GraphQLError } from "graphql";
import { log } from "node:console";
import { GqlAuthorization, GqlValidation } from "../../../Middlewares";

import { JWTService, Rolle, TokenType } from "../../../Utils";
import PostService from "../post.service";
import * as GqlPostValidationSchema from "./post.validation.gql";
class PostResolver {
  private readonly PostSerives;
  private readonly Authentication;
  constructor() {
    this.PostSerives = PostService;
    this.Authentication = JWTService;
  }
  GetPosts = async (
    parent: any,
    args: GqlPostValidationSchema.GetPostsArgsType,
    payloud: any,
  ) => {
    // ---------------- Authentication ---------------- \\
    //
    const { user } = await this.Authentication.Decode(
      payloud.headers.authorization,
      TokenType.Access,
    );
    log("decoded user from graphql resolver :", user);
    // ------------------------------------------------\\
    // ------------------------------------------------\\
    // ------------------------------------------------\\

    // ---------------- Authorization ---------------- \\
    //
    const AuthResult = GqlAuthorization([Rolle.User], user);
    if (!AuthResult) {
      throw new GraphQLError("User not Authorized to this query");
    }
    // ------------------------------------------------\\
    // ------------------------------------------------\\
    // ------------------------------------------------\\

    // ---------------- Validation ---------------- \\
    //
    // manule validation / take type + zod schema + data
    GqlValidation<GqlPostValidationSchema.GetPostsArgsType>(
      GqlPostValidationSchema.GetPostsArgs,
      args,
    );
    // ------------------------------------------------\\
    // ------------------------------------------------\\
    // ------------------------------------------------\\

    const result = await this.PostSerives.retrievePosts({
      user,
      postId: args.postId,
      limit: args.limit,
      page: args.page,
    });
    if (!result) {
      throw new GraphQLError("error while retrieve posts");
    }
    return {
      message: "done",
      metaData: result.metaData,
      data: result.data,
    };
    // return { };
  };
}

export default new PostResolver();
