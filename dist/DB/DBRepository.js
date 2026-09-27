"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const Utils_1 = require("../Utils");
class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    // */*/*/*/*/*/*/*/*/*/ find one methods
    async exists(filter) {
        return await this.model.exists(filter);
    }
    async find({ filter, selection, options, }) {
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
        if (options?.populate) {
            doc.populate(options.populate);
        }
        return await doc.exec();
    }
    async findOne({ filter, selection, options, }) {
        const doc = this.model.findOne(filter).select(selection || "");
        if (options?.populate) {
            doc.populate(options.populate);
        }
        return await doc.exec();
    }
    // ----------- find by id ------------------------
    async findById({ id, selection, options, }) {
        const doc = this.model.findById(id).select(selection || "");
        if (options?.populate) {
            doc.populate(options.populate);
        }
        return await doc.exec();
    }
    // */*/*/*/*/*/*/*/*/*/ insert methods
    async insertOne({ data, options, populate, }) {
        return await this.model.insertOne(data, options);
    }
    // ----------- insertmany
    async insertMany({ data, options, }) {
        if (options)
            return await this.model.insertMany(data, options);
        return await this.model.insertMany(data);
    }
    async Create({ data, options, }) {
        if (Array.isArray(data)) {
            return await this.insertMany({
                data,
                options: options,
            });
        }
        return await this.insertOne({ data, options: options });
    }
    // /*/*/*/*/*/*/*/*/*/*/*/* update methods
    async updateOne({ filter, update, options, }) {
        return await this.model.updateOne(filter, { ...update, $inc: { __v: 1 } }, { ...options, runValidators: true });
    }
    // /*/*/*/*/*/*/*/*/*/*/*/* delete methods
    async DeleteOne(filter) {
        const result = await this.model.findOneAndDelete(filter);
        if (!result) {
            throw new Utils_1.BadRequstExption("Error While Deleteing", result);
        }
        return result;
    }
}
exports.BaseRepository = BaseRepository;
