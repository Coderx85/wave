// sample.service.ts
import { type ISampleService } from "./sample.definition";

// Define service interface
export class SampleService implements ISampleService {
  //TODO:: Implement service methods here
}

// Export a singleton instance of the service
export const sampleService = new SampleService();
