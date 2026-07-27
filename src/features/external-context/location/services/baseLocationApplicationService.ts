import type { BaseLocationRepository } from '../repositories/index.ts';
import type { BaseLocation } from '../types/index.ts';
import { createBaseLocation, type BaseLocationInput } from './baseLocationFactory.ts';

export class BaseLocationApplicationService {
  private readonly repository: BaseLocationRepository;
  constructor(repository: BaseLocationRepository) { this.repository = repository; }
  getBaseLocation(): BaseLocation | null { return this.repository.get(); }
  setBaseLocation(input: BaseLocationInput): BaseLocation {
    const current = this.repository.get();
    const location = createBaseLocation(input, current ? { id: current.id, createdAt: current.createdAt } : {});
    this.repository.save(location); return location;
  }
  deleteBaseLocation(): void { this.repository.delete(); }
}
