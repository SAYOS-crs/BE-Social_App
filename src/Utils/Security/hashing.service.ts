import { hash, compare } from "bcrypt";
import { SULT } from "../../Config/config";

class HashingService {
  constructor() {}

  async Hash(content: string) {
    const HashedData = await hash(content, SULT);
    return HashedData;
  }

  async Compare(content: string, HashedData: string) {
    const result = await compare(content, HashedData);
    return result;
  }
}

export default new HashingService();
