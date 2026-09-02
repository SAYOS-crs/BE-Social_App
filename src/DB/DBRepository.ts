import mongoose, {
  ApplyBasicCreateCasting,
  HydratedDocument,
  InsertManyOptions,
  Model,
  MongooseUpdateQueryOptions,
  PopulateOptions,
  ProjectionType,
  QueryFilter,
  QueryOptions,
  SaveOptions,
  UpdateQuery,
} from "mongoose";
import { BadRequstExption } from "../Utils";

export class BaseRepository<Tdocment> {
  constructor(protected readonly model: Model<Tdocment>) {}

  // */*/*/*/*/*/*/*/*/*/ find one methods

  async exists(filter: QueryFilter<Tdocment>) {
    return await this.model.exists(filter);
  }

  async find({
    filter,
    selection,
    options,
  }: {
    filter?: QueryFilter<Tdocment> | undefined;
    selection?: ProjectionType<Tdocment> | undefined;
    options?: QueryOptions<Tdocment> | undefined;
  }): Promise<Tdocment | Tdocment[]> {
    const doc = this.model.find(filter);
    if (selection) {
      doc.select(selection);
    }
    if (options?.skip) {
      doc.skip(options.skip);
    }
    if (options?.limit) {
      doc.limit(options.limit);
    }
    return await doc.exec();
  }

  async findOne({
    filter,
    selection,
    options,
  }: {
    filter: QueryFilter<Tdocment>;
    selection?: ProjectionType<Tdocment>;
    options?: QueryOptions;
  }): Promise<HydratedDocument<Tdocment> | null> {
    const doc = this.model.findOne(filter).select(selection || "");
    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions);
    }
    return await doc.exec();
  }
  // ----------- find by id ------------------------
  async findById({
    id,
    selection,
    options,
  }: {
    id: mongoose.Types.ObjectId;
    selection?: ProjectionType<Tdocment>;
    options?: QueryOptions;
  }) {
    const doc = this.model.findById(id).select(selection || "");
    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions);
    }
    return await doc.exec();
  }
  // */*/*/*/*/*/*/*/*/*/ insert methods

  async insertOne({
    data,
    options,
    populate,
  }: {
    data: Partial<ApplyBasicCreateCasting<Tdocment>>;
    options?: SaveOptions;
    populate?: string;
  }): Promise<HydratedDocument<Tdocment>> {
    return await this.model.insertOne(data, options);
  }

  // ----------- insertmany
  async insertMany({
    data,
    options,
  }: {
    data: Array<Partial<ApplyBasicCreateCasting<Tdocment>>>;
    options?: InsertManyOptions;
  }) {
    if (options) return await this.model.insertMany(data, options);
    return await this.model.insertMany(data);
  }

  async Create({
    data,
    options,
  }: {
    data:
      | Partial<ApplyBasicCreateCasting<Tdocment>>
      | Array<Partial<ApplyBasicCreateCasting<Tdocment>>>;
    options?: SaveOptions | InsertManyOptions;
  }) {
    if (Array.isArray(data)) {
      return await this.insertMany({
        data,
        options: options as InsertManyOptions,
      });
    }
    return await this.insertOne({ data, options: options as SaveOptions });
  }

  // /*/*/*/*/*/*/*/*/*/*/*/* update methods

  async updateOne({
    filter,
    update,
    options,
  }: {
    filter: QueryFilter<Tdocment>;
    update: UpdateQuery<Tdocment>;
    options?: MongooseUpdateQueryOptions<Tdocment>;
  }) {
    return await this.model.updateOne(
      filter,
      { ...update, $inc: { __v: 1 } },
      { ...options, runValidators: true },
    );
  }
  // /*/*/*/*/*/*/*/*/*/*/*/* delete methods
  async DeleteOne(filter: QueryFilter<Tdocment>) {
    const result = await this.model.findOneAndDelete(filter);
    if (!result) {
      throw new BadRequstExption("Error While Deleteing", result);
    }
    return result;
  }
}
