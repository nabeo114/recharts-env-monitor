const config = {
  influxDB: {
    url: process.env.REACT_APP_INFLUXDB_URL || '',
    org: process.env.REACT_APP_INFLUXDB_ORG || '',
    bucket: process.env.REACT_APP_INFLUXDB_BUCKET || '',
    token: process.env.REACT_APP_INFLUXDB_TOKEN || '',
  },
};

export default config;
