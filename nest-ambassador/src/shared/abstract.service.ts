import { Repository } from 'typeorm';

export abstract class AbstractService {
  protected constructor(protected readonly repository: Repository<any>) {}

  async save(options) {
    return this.repository.save(options);
  }

  async findOne(options) {
    return this.repository.findOne(options);
  }

  async update(id: number, options) {
    this.repository.update(id, options);
  }

  async find(options = {}) {
    return this.repository.find(options);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }
}
