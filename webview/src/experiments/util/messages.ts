import { MessageFromWebviewType } from 'dvc/src/webview/contract'
import { sendMessage } from '../../shared/vscode'

export const focusFiltersTree = () =>
  sendMessage({ type: MessageFromWebviewType.FOCUS_FILTERS_TREE })

export const focusSortsTree = () =>
  sendMessage({ type: MessageFromWebviewType.FOCUS_SORTS_TREE })

export const openPlotsWebview = () =>
  sendMessage({ type: MessageFromWebviewType.OPEN_PLOTS_WEBVIEW })

export const addStarredFilter = () =>
  sendMessage({
    type: MessageFromWebviewType.ADD_STARRED_EXPERIMENT_FILTER
  })

export const showMoreCommits = () =>
  sendMessage({
    type: MessageFromWebviewType.SHOW_MORE_COMMITS
  })

export const showLessCommits = () =>
  sendMessage({
    type: MessageFromWebviewType.SHOW_LESS_COMMITS
  })

export const switchToBranchesView = () => {
  sendMessage({ type: MessageFromWebviewType.SWITCH_BRANCHES_VIEW })
}

export const switchToCommitsView = () => {
  sendMessage({ type: MessageFromWebviewType.SWITCH_COMMITS_VIEW })
}

export const selectBranches = () =>
  sendMessage({
    type: MessageFromWebviewType.SELECT_BRANCHES
  })

export const toggleExperiment = (id: string) =>
  sendMessage({
    payload: id,
    type: MessageFromWebviewType.TOGGLE_EXPERIMENT
  })

export const toggleStarred = (id: string) =>
  sendMessage({
    payload: [id],
    type: MessageFromWebviewType.TOGGLE_EXPERIMENT_STAR
  })