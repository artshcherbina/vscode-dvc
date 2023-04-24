import React from 'react'
import { BatchSelectionProp } from './Row'
import { NestedRow } from './NestedRow'
import { RowProp } from '../../../util/interfaces'

export const ExperimentGroup: React.FC<RowProp & BatchSelectionProp> = ({
  row,
  contextMenuDisabled,
  projectHasCheckpoints,
  hasRunningExperiment,
  batchRowSelection
}) => (
  <NestedRow
    row={row}
    contextMenuDisabled={contextMenuDisabled}
    projectHasCheckpoints={projectHasCheckpoints}
    hasRunningExperiment={hasRunningExperiment}
    batchRowSelection={batchRowSelection}
  />
)