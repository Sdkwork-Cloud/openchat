const dns = require('node:dns');

function parseDnsOverrides(value) {
  if (!value || typeof value !== 'string') {
    return {};
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((overrides, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex <= 0 || separatorIndex === entry.length - 1) {
        return overrides;
      }

      const hostname = entry.slice(0, separatorIndex).trim();
      const address = entry.slice(separatorIndex + 1).trim();
      if (!hostname || !address) {
        return overrides;
      }

      overrides[hostname] = address;
      return overrides;
    }, {});
}

function installDnsOverrides(overrides, dnsModule = dns) {
  if (!overrides || Object.keys(overrides).length === 0) {
    return () => {};
  }

  const originalLookup = dnsModule.lookup;

  dnsModule.lookup = function patchedLookup(hostname, options, callback) {
    const overrideAddress = overrides[hostname];
    if (!overrideAddress) {
      return originalLookup.call(dnsModule, hostname, options, callback);
    }

    if (typeof options === 'function') {
      return options(null, overrideAddress, 4);
    }

    const normalizedOptions = typeof options === 'number'
      ? { family: options }
      : typeof options === 'object' && options !== null
        ? options
        : {};

    if (normalizedOptions.all) {
      return callback(null, [{ address: overrideAddress, family: 4 }]);
    }

    return callback(null, overrideAddress, 4);
  };

  return () => {
    dnsModule.lookup = originalLookup;
  };
}

module.exports = {
  parseDnsOverrides,
  installDnsOverrides,
};
