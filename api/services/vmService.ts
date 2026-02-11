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
        const regex = new RegExp(search, 'i');
        query.$or = [
          { name: regex },
          { ip: regex },
          { username: regex }
        ];
      }

      const skip = (page - 1) * limit;

      const [vms, total] = await Promise.all([
        VMModel.find(query).skip(skip).limit(limit),
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
          environmentId: obj.environmentId
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
      environmentId: obj.environmentId
    };
  },

  async update(id: string, vmData: Partial<VM>): Promise<VM | null> {
    const updated = await VMModel.findByIdAndUpdate(id, vmData, { new: true });
    if (!updated) return null;
    
    const obj = updated.toObject();
    return {
      id: obj._id.toString(),
      name: obj.name,
      ip: obj.ip,
      username: obj.username,
      password: obj.password,
      port: obj.port,
      environmentId: obj.environmentId
    };
  },

  async delete(id: string): Promise<boolean> {
    const result = await VMModel.findByIdAndDelete(id);
    return !!result;
  },
};
