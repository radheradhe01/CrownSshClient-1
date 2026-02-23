import { VMModel } from '../models/VM.js';
import logger from '../utils/logger.js';

// Re-export interface for compatibility, or define a compatible one
export interface VM {
  id: string;
  name: string;
  ip: string;
  username: string;
  password?: string;
  port: number;
  environmentId?: string;
  isPinned?: boolean;
}

export const vmService = {
  async getAll(environmentId?: string, search?: string, page: number = 1, limit: number = 20): Promise<{ data: VM[], total: number }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {};

      if (environmentId) {
        query.environmentId = environmentId;
      }

      if (search) {
        // Use MongoDB Text Search for high performance
        // This uses the text index we created on name, ip, and username
        query.$text = { $search: search };
      }

      const skip = (page - 1) * limit;

      // For search, we can skip the expensive countDocuments for better speed 
      // if we only care about showing the first page of results in the dropdown
      if (search && page === 1) {
        const vms = await VMModel.find(query)
          .select({ score: { $meta: "textScore" } })
          .sort({ isPinned: -1, score: { $meta: "textScore" } }) // Sort by pinned first, then relevance
          .limit(limit);

        const mappedVMs = vms.map(v => {
          const obj = v.toObject();
          return {
            id: obj._id.toString(),
            name: obj.name,
            ip: obj.ip,
            username: obj.username,
            password: obj.password,
            port: obj.port,
            environmentId: obj.environmentId,
            isPinned: obj.isPinned
          };
        });
        return { data: mappedVMs, total: mappedVMs.length };
      }

      const [vms, total] = await Promise.all([
        VMModel.find(query)
          .sort({ isPinned: -1, _id: -1 }) // Sort by pinned first, then newest
          .skip(skip)
          .limit(limit),
        VMModel.countDocuments(query)
      ]);

      const mappedVMs = vms.map(v => {
        const obj = v.toObject();
        return {
          id: obj._id.toString(),
          name: obj.name,
          ip: obj.ip,
          username: obj.username,
          password: obj.password,
          port: obj.port,
          environmentId: obj.environmentId,
          isPinned: obj.isPinned
        };
      });

      return { data: mappedVMs, total };
    } catch (error) {
      logger.error('Error fetching VMs:', error);
      return { data: [], total: 0 };
    }
  },

  async getById(id: string): Promise<VM | undefined> {
    try {
      const v = await VMModel.findById(id);
      if (!v) return undefined;
      const obj = v.toObject();
      return {
        id: obj._id.toString(),
        name: obj.name,
        ip: obj.ip,
        username: obj.username,
        password: obj.password,
        port: obj.port,
        environmentId: obj.environmentId
      };
    } catch (error) {
      logger.error('Error fetching VM:', error);
      return undefined;
    }
  },

  async add(vmData: Omit<VM, 'id'>): Promise<VM> {
    const newVM = new VMModel({
      ...vmData,
      port: vmData.port || 22,
    });
    await newVM.save();

    const obj = newVM.toObject();
    return {
      id: obj._id.toString(),
      name: obj.name,
      ip: obj.ip,
      username: obj.username,
      password: obj.password,
      port: obj.port,
      environmentId: obj.environmentId,
      isPinned: obj.isPinned
    };
  },

  async update(id: string, vmData: Partial<VM>): Promise<VM | null> {
    const vm = await VMModel.findById(id);
    if (!vm) return null;

    Object.assign(vm, vmData);
    await vm.save();

    const obj = vm.toObject();
    return {
      id: obj._id.toString(),
      name: obj.name,
      ip: obj.ip,
      username: obj.username,
      password: obj.password,
      port: obj.port,
      environmentId: obj.environmentId,
      isPinned: obj.isPinned
    };
  },

  async delete(id: string): Promise<boolean> {
    const result = await VMModel.findByIdAndDelete(id);
    return !!result;
  },
};
