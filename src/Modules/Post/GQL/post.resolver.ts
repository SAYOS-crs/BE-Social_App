import { GraphQLError } from "graphql";
import { log } from "node:console";
import { JWTService, TokenType } from "../../../Utils";
import PostService from "../post.service";

class PostResolver {
  private readonly PostSerives;
  private readonly Authentication;
  constructor() {
    this.PostSerives = PostService;
    this.Authentication = JWTService;
  }
  GetPosts = async (parent: any, args: any, payloud: any) => {
    const { user, decoded } = await this.Authentication.Decode(
      payloud.headers.authorization,
      TokenType.Access,
    );
    log("decoded user from graphql resolver :", user);
    const result = await this.PostSerives.retrievePosts({
      user,
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
