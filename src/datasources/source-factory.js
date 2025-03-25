// source-factory.js placeholder
import ConfluenceDataSource from './sources/confluence';
import HaloISTMDataSource from './sources/halo-istm';

/**
 * Factory for creating data source adapters
 */
class DataSourceFactory {
  /**
   * Create a data source adapter instance
   * @param {string} type The type of data source to create
   * @param {Object} config Configuration for the data source
   * @returns {Promise<DataSourceInterface>} The created data source adapter
   */
  static async createDataSource(type, config) {
    let dataSource;

    switch (type.toLowerCase()) {
      case 'confluence':
        dataSource = new ConfluenceDataSource();
        break;
      case 'halo-istm':
        dataSource = new HaloISTMDataSource();
        break;
      default:
        throw new Error(`Unsupported data source type: ${type}`);
    }

    await dataSource.initialize(config);
    return dataSource;
  }
}

export default DataSourceFactory;