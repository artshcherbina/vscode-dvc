import React from 'react'
import get from 'lodash/get'
import { Column, Accessor } from 'react-table'
import { Experiment, ColumnData } from 'dvc/src/experiments/webview/contract'
import { formatFloat } from './numberFormatting'

type Value = string | number

const UndefinedCell = <>-</>

const Cell: React.FC<{ value: Value }> = ({ value }) => {
  if (value === undefined) {
    return UndefinedCell
  }

  if (typeof value === 'number' && !Number.isInteger(value)) {
    return <>{formatFloat(value as number)}</>
  }
  return <>{String(value)}</>
}

const getCellComponent = (): React.FC<{ value: Value }> => Cell

const buildColumnIdFromPath = (objectPath: string[]) =>
  objectPath.map(segment => `[${segment}]`).join('')

const buildAccessor: (valuePath: string[]) => Accessor<Experiment> =
  pathArray => originalRow =>
    get(originalRow, pathArray)

const buildDynamicColumns = (
  properties: ColumnData[],
  filter = (column: ColumnData) =>
    ['params', 'metrics'].includes(column.parentPath)
): Column<Experiment>[] =>
  properties.filter(filter).map(data => {
    const { path } = data
    const Cell = getCellComponent()
    const childColumns = buildDynamicColumns(
      properties,
      column => column.parentPath === path
    )
    const column: Column<Experiment> & {
      columns?: Column<Experiment>[]
      sortType?: string
      type?: string[]
    } = {
      Cell,
      Header: data.name,
      accessor: buildAccessor(path.split('/')),
      columns: childColumns.length ? childColumns : undefined,
      id: buildColumnIdFromPath(path.split('/')),
      type: data.types
    }
    switch (data.types) {
      case ['integer']:
      case ['number']:
        column.sortType = 'basic'
        break
      default:
    }
    return column
  })

export default buildDynamicColumns
