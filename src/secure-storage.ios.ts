import {
  GetOptions,
  SetOptions,
  RemoveOptions,
  RemoveAllOptions,
  SecureStorageCommon
} from "./secure-storage.common";

declare const SAMKeychainQuery, SAMKeychain;

export class SecureStorage extends SecureStorageCommon {
  private isSimulator: boolean;
  private accessibilityType: string;

  private static defaultService: string = "my_app";

  // This is a copy of 'kSSKeychainAccountKey_copy' which is not exposed from SSKeychain.h by {N}
  private static kSSKeychainAccountKey_copy: string = "acct";

  constructor(accessibilityType: string = kSecAttrAccessibleAlwaysThisDeviceOnly) {
    super();
    const isMinIOS9 = NSProcessInfo.processInfo.isOperatingSystemAtLeastVersion({majorVersion: 9, minorVersion: 0, patchVersion: 0});
    if (isMinIOS9) {
      const simDeviceName = NSProcessInfo.processInfo.environment.objectForKey("SIMULATOR_DEVICE_NAME");
      this.isSimulator = simDeviceName !== null;
    } else {
      this.isSimulator = UIDevice.currentDevice.name.toLowerCase().indexOf("simulator") > -1;
    }

    if (this.isSimulator) {
      console.log("Falling back to storing data in NSUserDefaults because of a Simulator bug");
    }

    this.accessibilityType = accessibilityType;
  }

  public get(arg: GetOptions): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.isSimulator) {
        resolve(NSUserDefaults.standardUserDefaults.objectForKey(arg.key));
        return;
      }

      let query = SAMKeychainQuery.new();
      query.service = arg.service || SecureStorage.defaultService;
      query.account = arg.key;

      try {
        query.fetch();
        resolve(query.password);
      } catch (e) {
        resolve(null);
      }
    });
  }

  getSync(arg: GetOptions): any {
    if (this.isSimulator) {
      return NSUserDefaults.standardUserDefaults.objectForKey(arg.key);
    }

    let query = SAMKeychainQuery.new();
    query.service = arg.service || SecureStorage.defaultService;
    query.account = arg.key;
    try {
      query.fetch();
      return query.password;
    } catch (e) {
      return null;
    }
  }

  public set(arg: SetOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.isSimulator) {
        NSUserDefaults.standardUserDefaults.setObjectForKey(arg.value, arg.key);
        resolve(true);
        return;
      }

      SAMKeychain.setAccessibilityType(this.accessibilityType);
      let query = SAMKeychainQuery.new();
      query.service = arg.service || SecureStorage.defaultService;
      query.account = arg.key;
      query.password = arg.value;
      resolve(query.save());
    });
  }

  setSync(arg: SetOptions): boolean {
    if (this.isSimulator) {
      NSUserDefaults.standardUserDefaults.setObjectForKey(arg.value, arg.key);
      return true;
    }

    SAMKeychain.setAccessibilityType(this.accessibilityType);
    let query = SAMKeychainQuery.new();
    query.service = arg.service || SecureStorage.defaultService;
    query.account = arg.key;
    query.password = arg.value;
    return query.save();
  }

  public remove(arg: RemoveOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.isSimulator) {
        NSUserDefaults.standardUserDefaults.removeObjectForKey(arg.key);
        resolve(true);
        return;
      }

      let query = SAMKeychainQuery.new();
      query.service = arg.service || SecureStorage.defaultService;
      query.account = arg.key;
      try {
        resolve(query.deleteItem());
      } catch (e) {
        resolve(false);
      }
    });
  }

  removeSync(arg: RemoveOptions): boolean {
    if (this.isSimulator) {
      NSUserDefaults.standardUserDefaults.removeObjectForKey(arg.key);
      return true;
    }

    let query = SAMKeychainQuery.new();
    query.service = arg.service || SecureStorage.defaultService;
    query.account = arg.key;
    try {
      return query.deleteItem();
    } catch (e) {
      return false;
    }
  }

  public removeAll(arg?: RemoveAllOptions): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.isSimulator) {
        let defaults = NSUserDefaults.standardUserDefaults;
        let bundleId = NSBundle.mainBundle.bundleIdentifier;
        defaults.removePersistentDomainForName(bundleId);
        resolve(true);
        return;
      }

      const allAccounts = SAMKeychain.allAccounts();
      for (let i = 0; i < allAccounts.count; i++) {
        let key = allAccounts[i].objectForKey(SecureStorage.kSSKeychainAccountKey_copy);
        try {
          let query = SAMKeychainQuery.new();
          query.service = arg && arg.service ? arg.service : SecureStorage.defaultService;
          query.account = key;
          query.deleteItem();
        } catch (e) {
          console.log("SecureStorage: Could not remove key -> " + key);
        }
      }
      resolve(true);
    });
  }

  public removeAllSync(arg?: RemoveAllOptions): boolean {
    if (this.isSimulator) {
      let defaults = NSUserDefaults.standardUserDefaults;
      let bundleId = NSBundle.mainBundle.bundleIdentifier;
      defaults.removePersistentDomainForName(bundleId);
      return true;
    }

    const allAccounts = SAMKeychain.allAccounts();
    for (let i = 0; i < allAccounts.count; i++) {
      let key = allAccounts[i].objectForKey(SecureStorage.kSSKeychainAccountKey_copy);
      try {
        let query = SAMKeychainQuery.new();
        query.service = arg && arg.service ? arg.service : SecureStorage.defaultService;
        query.account = key;
        query.deleteItem();
      } catch (e) {
        console.log("SecureStorage: Could not remove key -> " + key);
      }
    }
    return true;
  }
}
