import { ColumnsModel } from './model'
import { appendColumnToPath, buildMetricOrParamPath } from './paths'
import { timestampColumn } from './constants'
import { buildMockMemento } from '../../test/util'
import { Status } from '../../path/selection/model'
import { PersistenceKey } from '../../persistence/constants'
import { ColumnType } from '../webview/contract'
import outputFixture from '../../test/fixtures/expShow/output'
import columnsFixture from '../../test/fixtures/expShow/columns'
import {
  deeplyNestedOutput,
  columns as deeplyNestedColumns,
  columnsWithDepthOf10 as deeplyNestedColumnsWithDepthOf10,
  columnsWithDepthOf3 as deeplyNestedColumnsWithDepthOf3,
  columnsWithDepthOf2 as deeplyNestedColumnsWithDepthOf2,
  columnsWithDepthOf1 as deeplyNestedColumnsWithDepthOf1
} from '../../test/fixtures/expShow/deeplyNested'
import {
  dataTypesOutput,
  columns as dataTypesColumns
} from '../../test/fixtures/expShow/dataTypes'
import { getConfigValue } from '../../vscode/config'

jest.mock('../../vscode/config')

const mockedGetConfigValue = jest.mocked(getConfigValue)

beforeEach(() => {
  jest.resetAllMocks()
  mockedGetConfigValue.mockReturnValue(5)
})

describe('ColumnsModel', () => {
  const exampleDvcRoot = 'test'

  it('should return the expected columns when given the default output fixture', async () => {
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(outputFixture)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(columnsFixture)
  })

  it('should return the expected columns when given the deeply nested output fixture', async () => {
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(deeplyNestedOutput)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(deeplyNestedColumns)
  })

  it('should return the expected columns when the max depth config is set to 10', async () => {
    mockedGetConfigValue.mockReturnValue(10)
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(deeplyNestedOutput)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(deeplyNestedColumnsWithDepthOf10)
  })

  it('should return the expected columns when the max depth config is set to 3', async () => {
    mockedGetConfigValue.mockReturnValue(3)
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(deeplyNestedOutput)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(deeplyNestedColumnsWithDepthOf3)
  })

  it('should return the expected columns when the max depth config is set to 2', async () => {
    mockedGetConfigValue.mockReturnValue(2)
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(deeplyNestedOutput)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(deeplyNestedColumnsWithDepthOf2)
  })

  it('should return the expected columns when the max depth config is set to 1', async () => {
    mockedGetConfigValue.mockReturnValue(1)
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(deeplyNestedOutput)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(deeplyNestedColumnsWithDepthOf1)
  })

  it('should return the expected columns when the max depth config is set to 0', async () => {
    mockedGetConfigValue.mockReturnValue(0)
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(deeplyNestedOutput)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(deeplyNestedColumnsWithDepthOf10)
  })

  it('should return the expected columns when the max depth config is set to -1', async () => {
    mockedGetConfigValue.mockReturnValue(-1)
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(deeplyNestedOutput)
    expect(mockedGetConfigValue).toHaveBeenCalled()
    expect(model.getSelected()).toStrictEqual(deeplyNestedColumnsWithDepthOf10)
  })

  it('should return the expected columns when given the data types output fixture', async () => {
    const model = new ColumnsModel('', buildMockMemento())
    await model.transformAndSet(dataTypesOutput)
    expect(model.getSelected()).toStrictEqual(dataTypesColumns)
  })

  describe('persistence', () => {
    const paramsDotYamlPath = buildMetricOrParamPath(
      ColumnType.PARAMS,
      'params.yaml'
    )
    const testParamPath = appendColumnToPath(paramsDotYamlPath, 'testparam')
    const exampleData = {
      workspace: {
        baseline: {
          data: {
            params: {
              'params.yaml': {
                data: {
                  testparam: true
                }
              }
            }
          }
        }
      }
    }
    it('Shows all items when given no persisted status', async () => {
      const model = new ColumnsModel(exampleDvcRoot, buildMockMemento())
      await model.transformAndSet(exampleData)
      expect(model.getSelected()).toStrictEqual([
        timestampColumn,
        {
          hasChildren: true,
          label: 'params.yaml',
          parentPath: ColumnType.PARAMS,
          path: paramsDotYamlPath,
          type: ColumnType.PARAMS
        },
        {
          hasChildren: false,
          label: 'testparam',
          maxStringLength: 4,
          parentPath: paramsDotYamlPath,
          path: testParamPath,
          pathArray: [ColumnType.PARAMS, 'params.yaml', 'testparam'],
          type: ColumnType.PARAMS,
          types: ['boolean']
        }
      ])
    })

    it('Maintains deselection from persisted status', async () => {
      const model = new ColumnsModel(
        exampleDvcRoot,
        buildMockMemento({
          [PersistenceKey.METRICS_AND_PARAMS_STATUS + exampleDvcRoot]: {
            [paramsDotYamlPath]: Status.INDETERMINATE,
            [testParamPath]: Status.UNSELECTED
          }
        })
      )
      await model.transformAndSet(exampleData)
      expect(model.getSelected()).toStrictEqual([
        timestampColumn,
        {
          hasChildren: true,
          label: 'params.yaml',
          parentPath: ColumnType.PARAMS,
          path: paramsDotYamlPath,
          type: ColumnType.PARAMS
        }
      ])
    })
  })

  describe('columns order', () => {
    it('should return the columns order from the persisted state', () => {
      const persistedState = [
        { path: 'A', width: 0 },
        { path: 'C', width: 0 },
        { path: 'B', width: 0 }
      ]
      const model = new ColumnsModel(
        exampleDvcRoot,
        buildMockMemento({
          [PersistenceKey.METRICS_AND_PARAMS_COLUMN_ORDER + exampleDvcRoot]:
            persistedState
        })
      )
      expect(model.getColumnOrder()).toStrictEqual(persistedState)
    })

    it('should re-order the columns if a new columnOrder is set', () => {
      const model = new ColumnsModel(
        exampleDvcRoot,
        buildMockMemento({
          [PersistenceKey.METRICS_AND_PARAMS_COLUMN_ORDER + exampleDvcRoot]: [
            { path: 'A', width: 0 },
            { path: 'B', width: 0 },
            { path: 'C', width: 0 }
          ]
        })
      )
      const newState = ['C', 'B', 'A']
      model.setColumnOrder(newState)
      expect(model.getColumnOrder()).toStrictEqual(newState)
    })
  })

  describe('columns width', () => {
    it('should return the columns width from the persisted state', () => {
      const persistedState = [
        { path: 'A', width: 10 },
        { path: 'C', width: 42 },
        { path: 'B', width: 150 }
      ]
      const model = new ColumnsModel(
        exampleDvcRoot,
        buildMockMemento({
          [PersistenceKey.METRICS_AND_PARAMS_COLUMN_ORDER + exampleDvcRoot]:
            persistedState
        })
      )
      expect(model.getColumnOrder()).toStrictEqual(persistedState)
    })

    it('should set the width to a column when calling setColumnWidth', () => {
      const persistedState = [
        { path: 'A', width: 10 },
        { path: 'C', width: 42 },
        { path: 'B', width: 150 }
      ]
      const model = new ColumnsModel(
        exampleDvcRoot,
        buildMockMemento({
          [PersistenceKey.METRICS_AND_PARAMS_COLUMN_ORDER + exampleDvcRoot]:
            persistedState
        })
      )
      const changedColumnId = 'C'
      const expectedWidth = 77

      model.setColumnWidth(changedColumnId, expectedWidth)

      expect(model.getColumnWidths()[changedColumnId]).toBe(expectedWidth)
    })
  })
})
