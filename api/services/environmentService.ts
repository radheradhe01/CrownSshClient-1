import { Environment, IEnvironment } from '../models/Environment.js';

export const environmentService = {
  async getAll(): Promise<IEnvironment[]> {
    try {
      let envs = await Environment.find();
      
      // Seeding if empty
      if (envs.length === 0) {
        const defaults = [
          { 
            name: 'IVG', 
            command: "echo '{{PASSWORD}}' | su -c 'cd /usr/local/freeswitch/bin/ && ps aux | grep freeswitch && pkill -9 freeswitch; sync; echo 3 > /proc/sys/vm/drop_caches; ./freeswitch'" 
          },
          { 
            name: 'OPS', 
            command: "echo '{{PASSWORD}}' | su -c 'sudo service opensips restart && sudo systemctl restart opensips'" 
          },
          { 
            name: 'VOSS', 
            command: "echo '{{PASSWORD}}' | su -c '/etc/init.d/mgcd restart && /etc/init.d/vos3000d restart && /etc/init.d/webserverd restart && /etc/init.d/webdatad restart && /etc/init.d/callserviced restart && /etc/init.d/servermonitord restart && /etc/init.d/mbx3000d restart && /etc/init.d/valueaddedd restart && /etc/init.d/diald restart'" 
          }
        ];
        
        // Use insertMany for bulk creation
        envs = await Environment.insertMany(defaults);
        console.log('Seeded default environments');
      }
      
      // Transform _id to id for frontend compatibility if needed, 
      // but usually JSON.stringify handles it if we use .toJSON() or just rely on frontend handling _id.
      // For now, let's just return the docs. The frontend might need to update 'id' to '_id' or we map it.
      return envs.map(e => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = e.toObject() as any;
        obj.id = obj._id.toString();
        return obj as IEnvironment;
      });
    } catch (error) {
      console.error('Error fetching environments:', error);
      return [];
    }
  },

  async getById(id: string): Promise<IEnvironment | null> {
    const env = await Environment.findById(id);
    if (env) {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const obj = env.toObject() as any;
       obj.id = obj._id.toString();
       return obj as IEnvironment;
    }
    return null;
  },

  async add(name: string): Promise<IEnvironment> {
    const newEnv = new Environment({
      name,
      command: "echo '{{PASSWORD}}' | su -c 'cd /usr/local/freeswitch/bin/ && ps aux | grep freeswitch && pkill -9 freeswitch && sync && echo 3 > /proc/sys/vm/drop_caches && ./freeswitch'"
    });
    await newEnv.save();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = newEnv.toObject() as any;
    obj.id = obj._id.toString();
    return obj as IEnvironment;
  },

  async update(id: string, data: Partial<IEnvironment>): Promise<IEnvironment | null> {
    const updated = await Environment.findByIdAndUpdate(id, data, { new: true });
    if (updated) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = updated.toObject() as any;
        obj.id = obj._id.toString();
        return obj as IEnvironment;
    }
    return null;
  },
  
  async delete(id: string): Promise<boolean> {
    const result = await Environment.findByIdAndDelete(id);
    return !!result;
  }
};
