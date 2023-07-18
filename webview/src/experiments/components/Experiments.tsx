import React, {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { useSelector } from 'react-redux'
import {
  Column,
  Commit,
  ColumnType,
  Experiment
} from 'dvc/src/experiments/webview/contract'
import {
  ColumnDef,
  CellContext,
  useReactTable,
  Row as TableRow,
  getCoreRowModel,
  getExpandedRowModel,
  ColumnSizingState
} from '@tanstack/react-table'
import { Table } from './table/Table'
import styles from './table/styles.module.scss'
import { ErrorState } from './emptyState/ErrorState'
import { GetStarted } from './emptyState/GetStarted'
import { RowSelectionProvider } from './table/RowSelectionContext'
import { CellValue } from './table/content/Cell'
import { AddStage } from './AddStage'
import { ExperimentCell } from './table/content/ExperimentCell'
import { buildColumns, columnHelper } from '../util/buildColumns'
import { WebviewWrapper } from '../../shared/components/webviewWrapper/WebviewWrapper'
import { EmptyState } from '../../shared/components/emptyState/EmptyState'
import { ExperimentsState } from '../store'
import { EXPERIMENT_COLUMN_ID } from '../util/columns'
import { resizeColumn } from '../util/messages'

const DEFAULT_COLUMN_WIDTH = 90
const MINIMUM_COLUMN_WIDTH = 90

const ExperimentHeader = () => (
  <div className={styles.experimentHeader}>Experiment</div>
)

const getDefaultColumn = () =>
  columnHelper.accessor(() => EXPERIMENT_COLUMN_ID, {
    cell: (cell: CellContext<Column, CellValue>) => {
      const {
        row: {
          original: { label, description, commit, sha, error }
        }
      } = cell as unknown as CellContext<Experiment, CellValue>
      return (
        <ExperimentCell
          commit={commit}
          description={description}
          error={error}
          label={label}
          sha={sha}
        />
      )
    },
    header: ExperimentHeader,
    id: EXPERIMENT_COLUMN_ID,
    minSize: 230,
    size: 240
  })

const getColumns = (columns: Column[]) => {
  const includeTimestamp = columns.some(
    ({ type }) => type === ColumnType.TIMESTAMP
  )

  const timestampColumn =
    (includeTimestamp &&
      buildColumns(
        [
          {
            hasChildren: false,
            label: 'Created',
            parentPath: ColumnType.TIMESTAMP,
            path: 'Created',
            type: ColumnType.TIMESTAMP,
            width: 100
          }
        ],
        ColumnType.TIMESTAMP
      )) ||
    []

  return [
    getDefaultColumn(),
    ...timestampColumn,
    ...buildColumns(columns, ColumnType.METRICS),
    ...buildColumns(columns, ColumnType.PARAMS),
    ...buildColumns(columns, ColumnType.DEPS)
  ]
}

const reportResizedColumn = (
  state: ColumnSizingState,
  columnWidths: ColumnSizingState,
  debounceTimer: MutableRefObject<number>
) => {
  for (const id of Object.keys(state)) {
    const width = state[id]
    if (width !== columnWidths[id]) {
      window.clearTimeout(debounceTimer.current)
      debounceTimer.current = window.setTimeout(() => {
        resizeColumn(id, width)
      }, 500)
    }
  }
}

const defaultColumn: Partial<ColumnDef<Commit>> = {
  minSize: MINIMUM_COLUMN_WIDTH,
  size: DEFAULT_COLUMN_WIDTH
}

export const ExperimentsTable: React.FC = () => {
  const {
    columns: columnsData,
    columnOrder: columnOrderData,
    columnWidths,
    hasColumns,
    hasConfig,
    rows: data
  } = useSelector((state: ExperimentsState) => state.tableData)

  const [expanded, setExpanded] = useState({})

  const [columns, setColumns] = useState(getColumns(columnsData))
  const [columnSizing, setColumnSizing] =
    useState<ColumnSizingState>(columnWidths)
  const [columnOrder, setColumnOrder] = useState(columnOrderData)
  const resizeTimeout = useRef(0)

  useEffect(() => {
    reportResizedColumn(columnSizing, columnWidths, resizeTimeout)
  }, [columnSizing, columnWidths])

  useEffect(() => {
    setColumns(getColumns(columnsData))
  }, [columnsData])

  useEffect(() => {
    setColumnOrder(columnOrderData)
  }, [columnOrderData])

  const getRowId = useCallback(
    (experiment: Commit, relativeIndex: number, parent?: TableRow<Commit>) =>
      parent ? [parent.id, experiment.id].join('.') : String(relativeIndex),
    []
  )

  const instance = useReactTable<Commit>({
    autoResetAll: false,
    columnResizeMode: 'onChange',
    columns: columns as ColumnDef<Commit, unknown>[],
    data,
    defaultColumn,
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId,
    getSubRows: row => row.subRows,
    onColumnSizingChange: setColumnSizing,
    onExpandedChange: setExpanded,
    state: {
      columnOrder,
      columnSizing,
      expanded
    }
  })

  const { toggleAllRowsExpanded } = instance

  useEffect(() => {
    toggleAllRowsExpanded()
  }, [toggleAllRowsExpanded])

  const hasOnlyDefaultColumns = columns.length <= 1
  const hasOnlyWorkspace = data.length <= 1
  if (hasOnlyDefaultColumns || hasOnlyWorkspace) {
    return <GetStarted showWelcome={!hasColumns || hasOnlyWorkspace} />
  }
  return (
    <RowSelectionProvider>
      <Table instance={instance} onColumnOrderChange={setColumnOrder} />
      {!hasConfig && <AddStage />}
    </RowSelectionProvider>
  )
}

const Experiments: React.FC = () => {
  const { cliError, hasData } = useSelector(
    (state: ExperimentsState) => state.tableData
  )

  if (cliError) {
    return (
      <WebviewWrapper className={styles.experiments}>
        <ErrorState cliError={cliError} />
      </WebviewWrapper>
    )
  }

  return (
    <WebviewWrapper className={styles.experiments}>
      {hasData ? (
        <ExperimentsTable />
      ) : (
        <EmptyState>Loading Experiments...</EmptyState>
      )}
    </WebviewWrapper>
  )
}

export default Experiments
