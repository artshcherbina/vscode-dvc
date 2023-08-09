import { spy, stub } from 'sinon'
import { WorkspaceExperiments } from '../../../experiments/workspace'
import { Experiments } from '../../../experiments'
import { Disposer } from '../../../extension'
import expShowFixture from '../../fixtures/expShow/base/output'
import gitLogFixture from '../../fixtures/expShow/base/gitLog'
import rowOrderFixture from '../../fixtures/expShow/base/rowOrder'
import remoteExpRefsFixture from '../../fixtures/expShow/base/remoteExpRefs'
import { buildMockMemento, dvcDemoPath } from '../../util'
import {
  buildDependencies,
  buildInternalCommands,
  buildMockExperimentsData,
  getMessageReceivedEmitter,
  SafeWatcherDisposer
} from '../util'
import { ExperimentsData } from '../../../experiments/data'
import * as Watcher from '../../../fileSystem/watcher'
import { ExperimentsModel } from '../../../experiments/model'
import { ColumnsModel } from '../../../experiments/columns/model'
import { DEFAULT_CURRENT_BRANCH_COMMITS_TO_SHOW } from '../../../cli/dvc/constants'
import { PersistenceKey } from '../../../persistence/constants'
import { ExpShowOutput } from '../../../cli/dvc/contract'
import { buildExperimentsPipeline } from '../pipeline/util'
import { Setup } from '../../../setup'

export const DEFAULT_EXPERIMENTS_OUTPUT = {
  availableNbCommits: { main: 5 },
  expShow: expShowFixture,
  gitLog: gitLogFixture,
  rowOrder: rowOrderFixture
}

export const buildExperiments = ({
  availableNbCommits = { main: 5 },
  disposer,
  dvcRoot = dvcDemoPath,
  expShow = expShowFixture,
  gitLog = gitLogFixture,
  remoteExpRefs = remoteExpRefsFixture,
  rowOrder = rowOrderFixture,
  stageList = 'train'
}: {
  availableNbCommits?: { [branch: string]: number }
  disposer: Disposer
  dvcRoot?: string
  expShow?: ExpShowOutput
  gitLog?: string
  remoteExpRefs?: string
  rowOrder?: { branch: string; sha: string }[]
  stageList?: string | null
}) => {
  const {
    dvcExecutor,
    dvcReader,
    dvcRunner,
    dvcViewer,
    gitReader,
    internalCommands,
    mockCheckSignalFile,
    mockExpShow,
    mockGetCommitMessages,
    resourceLocator
  } = buildDependencies({ disposer, expShow, stageList })

  const mockUpdateExperimentsData = stub()
  const mockExperimentsData = buildMockExperimentsData(
    mockUpdateExperimentsData
  )

  const pipeline = buildExperimentsPipeline({
    disposer,
    dvcRoot,
    internalCommands
  })
  const mockCheckOrAddPipeline = stub(pipeline, 'checkOrAddPipeline')
  const mockSelectBranches = stub().resolves(['main', 'other'])
  const mockMemento = buildMockMemento({
    [`${PersistenceKey.EXPERIMENTS_BRANCHES}${dvcRoot}`]: ['main'],
    [`${PersistenceKey.NUMBER_OF_COMMITS_TO_SHOW}${dvcRoot}`]: {
      main: 5
    }
  })

  const experiments = disposer.track(
    new Experiments(
      dvcRoot,
      internalCommands,
      pipeline,
      resourceLocator,
      mockMemento,
      mockSelectBranches,
      [],
      mockExperimentsData
    )
  )

  void Promise.all([
    experiments.setState({
      availableNbCommits,
      expShow,
      gitLog,
      rowOrder
    }),
    experiments.setState({ remoteExpRefs })
  ])

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,
    columnsModel: (experiments as any).columns as ColumnsModel,
    dvcExecutor,
    dvcReader,
    dvcRunner,
    dvcViewer,
    experiments,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    experimentsModel: (experiments as any).experiments as ExperimentsModel,
    gitReader,
    internalCommands,
    mockCheckOrAddPipeline,
    mockCheckSignalFile,
    mockExpShow,
    mockExperimentsData,
    mockGetCommitMessages,
    mockSelectBranches,
    mockUpdateExperimentsData,
    pipeline,
    resourceLocator
  }
}

export const buildExperimentsWebview = async (inputs: {
  availableNbCommits?: { [branch: string]: number }
  disposer: Disposer
  dvcRoot?: string
  expShow?: ExpShowOutput
  gitLog?: string
  remoteExpRefs?: string
  rowOrder?: { branch: string; sha: string }[]
  stageList?: string | null
}) => {
  const all = buildExperiments(inputs)
  const { experiments } = all
  await experiments.isReady()
  const webview = await experiments.showWebview()
  await webview.isReady()
  const messageSpy = spy(webview, 'show')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (experiments as any).webviewMessages.sendWebviewMessage()

  const mockMessageReceived = getMessageReceivedEmitter(webview)

  return {
    ...all,
    messageSpy,
    mockMessageReceived,
    webview
  }
}

export const buildMultiRepoExperiments = (disposer: SafeWatcherDisposer) => {
  const {
    experiments: mockExperiments,
    gitReader,
    internalCommands,
    resourceLocator
  } = buildExperiments({
    disposer,
    dvcRoot: 'other/dvc/root',
    expShow: expShowFixture
  })

  stub(gitReader, 'getGitRepositoryRoot').resolves(dvcDemoPath)
  const workspaceExperiments = disposer.track(
    new WorkspaceExperiments(internalCommands, buildMockMemento(), {
      'other/dvc/root': mockExperiments
    })
  )

  const pipeline = buildExperimentsPipeline({
    disposer,
    dvcRoot: dvcDemoPath,
    internalCommands
  })
  stub(pipeline, 'hasPipeline').returns(true)

  const [experiments] = workspaceExperiments.create(
    [dvcDemoPath],
    { [dvcDemoPath]: [] },
    { getRepository: () => pipeline },
    resourceLocator
  )

  void experiments.setState(DEFAULT_EXPERIMENTS_OUTPUT)
  return { experiments, internalCommands, workspaceExperiments }
}

export const buildSingleRepoExperiments = (disposer: SafeWatcherDisposer) => {
  const { config, internalCommands, gitReader, resourceLocator } =
    buildDependencies({ disposer })

  stub(gitReader, 'getGitRepositoryRoot').resolves(dvcDemoPath)
  const workspaceExperiments = disposer.track(
    new WorkspaceExperiments(internalCommands, buildMockMemento())
  )

  const pipeline = buildExperimentsPipeline({
    disposer,
    dvcRoot: dvcDemoPath,
    internalCommands
  })

  const [experiments] = workspaceExperiments.create(
    [dvcDemoPath],
    { [dvcDemoPath]: [] },
    { getRepository: () => pipeline },
    resourceLocator
  )

  void experiments.setState(DEFAULT_EXPERIMENTS_OUTPUT)

  return {
    config,
    internalCommands,
    resourceLocator,
    workspaceExperiments
  }
}

const buildExperimentsDataDependencies = (disposer: Disposer) => {
  const mockCreateFileSystemWatcher = stub(
    Watcher,
    'createFileSystemWatcher'
  ).returns(undefined)

  const { dvcReader, gitReader, internalCommands } =
    buildInternalCommands(disposer)
  const mockExpShow = stub(dvcReader, 'expShow').resolves(expShowFixture)
  return {
    gitReader,
    internalCommands,
    mockCreateFileSystemWatcher,
    mockExpShow
  }
}

export const buildExperimentsData = (
  disposer: SafeWatcherDisposer,
  currentBranch = '* main',
  commitOutput = gitLogFixture
) => {
  const {
    internalCommands,
    mockExpShow,
    mockCreateFileSystemWatcher,
    gitReader
  } = buildExperimentsDataDependencies(disposer)

  stub(gitReader, 'getBranches').resolves([currentBranch, 'one'])
  stub(gitReader, 'getRemoteExperimentRefs').resolves('')
  const mockGetCommitMessages = stub(gitReader, 'getCommitMessages').resolves(
    commitOutput
  )
  const mockGetNumCommits = stub(gitReader, 'getNumCommits').resolves(404)

  const mockGetBranchesToShow = stub().returns(['main'])
  const mockSetBranches = stub()
  const data = disposer.track(
    new ExperimentsData(
      dvcDemoPath,
      internalCommands,
      {
        getBranchesToShow: mockGetBranchesToShow,
        getNbOfCommitsToShow: () => DEFAULT_CURRENT_BRANCH_COMMITS_TO_SHOW,
        setBranches: mockSetBranches
      } as unknown as ExperimentsModel,
      []
    )
  )

  return {
    data,
    mockCreateFileSystemWatcher,
    mockExpShow,
    mockGetBranchesToShow,
    mockGetCommitMessages,
    mockGetNumCommits,
    mockSetBranches
  }
}

const stubWorkspaceExperiments = (
  dvcRoot: string,
  experiments: Experiments
) => {
  const mockGetOnlyOrPickProject = stub(
    WorkspaceExperiments.prototype,
    'getOnlyOrPickProject'
  ).resolves(dvcRoot)

  const mockGetRepository = stub(
    WorkspaceExperiments.prototype,
    'getRepository'
  ).returns(experiments)

  return { mockGetOnlyOrPickProject, mockGetRepository }
}

export const stubWorkspaceGetters = async (
  disposer: Disposer,
  dvcRoot = dvcDemoPath
) => {
  const {
    columnsModel,
    dvcExecutor,
    dvcRunner,
    experiments,
    experimentsModel
  } = buildExperiments({ disposer })

  await experiments.isReady()

  stub(Setup.prototype, 'shouldBeShown').returns({
    dvc: true,
    experiments: true
  })

  return {
    columnsModel,
    dvcExecutor,
    dvcRunner,
    experiments,
    experimentsModel,
    ...stubWorkspaceExperiments(dvcRoot, experiments)
  }
}

export const stubWorkspaceGettersWebview = async (
  disposer: Disposer,
  dvcRoot = dvcDemoPath
) => {
  const {
    columnsModel,
    dvcExecutor,
    dvcRunner,
    experiments,
    experimentsModel,
    messageSpy,
    mockMessageReceived
  } = await buildExperimentsWebview({ disposer })

  return {
    columnsModel,
    dvcExecutor,
    dvcRunner,
    experiments,
    experimentsModel,
    messageSpy,
    ...stubWorkspaceExperiments(dvcRoot, experiments),
    mockMessageReceived
  }
}
