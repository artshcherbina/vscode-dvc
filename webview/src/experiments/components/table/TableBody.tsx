import React from 'react'
import { useSelector } from 'react-redux'
import cx from 'classnames'
import { useInView } from 'react-intersection-observer'
import { EXPERIMENT_WORKSPACE_ID } from 'dvc/src/cli/dvc/contract'
import styles from './styles.module.scss'
import { BatchSelectionProp, RowContent } from './Row'
import { InstanceProp, RowProp } from './interfaces'
import { ExperimentGroup } from './ExperimentGroup'
import { ExperimentsState } from '../../store'

const WorkspaceRowGroupWrapper: React.FC<
  {
    children: React.ReactNode
    root: HTMLElement | null
    tableHeaderHeight: number
  } & InstanceProp
> = ({ children, root, tableHeaderHeight }) => {
  const [ref, needsShadow] = useInView({
    root,
    rootMargin: `-${tableHeaderHeight + 15}px 0px 0px 0px`,
    threshold: 1
  })

  return (
    <tbody
      ref={ref}
      className={cx(styles.workspaceRowGroup, needsShadow && styles.withShadow)}
    >
      {children}
    </tbody>
  )
}
export const TableBody: React.FC<
  RowProp &
    InstanceProp &
    BatchSelectionProp & {
      root: HTMLElement | null
      tableHeaderHeight: number
    }
> = ({
  row,
  instance,
  contextMenuDisabled,
  projectHasCheckpoints,
  hasRunningExperiment,
  batchRowSelection,
  root,
  tableHeaderHeight
}) => {
  const contentProps = {
    batchRowSelection,
    contextMenuDisabled,
    hasRunningExperiment,
    key: row.id,
    projectHasCheckpoints,
    row
  }
  const isBranchesView = useSelector(
    (state: ExperimentsState) => state.tableData.isBranchesView
  )
  const content =
    row.depth > 0 ? (
      <ExperimentGroup {...contentProps} />
    ) : (
      <RowContent {...contentProps} />
    )

  return row.original.id === EXPERIMENT_WORKSPACE_ID ? (
    <WorkspaceRowGroupWrapper
      tableHeaderHeight={tableHeaderHeight}
      root={root}
      instance={instance}
    >
      {content}
    </WorkspaceRowGroupWrapper>
  ) : (
    <>
      {row.index === 2 && row.depth === 0 && (
        <tbody>
          <tr className={cx(styles.experimentsTr, styles.previousCommitsRow)}>
            <td className={styles.experimentsTd}>
              {isBranchesView ? 'Other Branches' : 'Previous Commits'}
            </td>
            <td
              className={styles.experimentsTd}
              colSpan={row.getAllCells().length - 1}
            ></td>
          </tr>
        </tbody>
      )}
      <tbody
        className={cx(styles.rowGroup, {
          [styles.experimentGroup]: row.depth > 0,
          [styles.expandedGroup]: row.getIsExpanded() && row.subRows.length > 0
        })}
      >
        {content}
      </tbody>
    </>
  )
}
