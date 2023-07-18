import { join } from 'path'
import { pickPaths } from './quickPick'
import { quickPickManyValues } from '../../vscode/quickPick'
import { Toast } from '../../vscode/toast'
import { Title } from '../../vscode/title'
import { PathType } from '../../plots/paths/collect'
import { EXPERIMENT_WORKSPACE_ID } from '../../cli/dvc/contract'

jest.mock('../../vscode/quickPick')
jest.mock('../../vscode/toast')

const mockedQuickPickManyValues = jest.mocked(quickPickManyValues)
const mockedToast = jest.mocked(Toast)
const mockedShowError = jest.fn()
mockedToast.showError = mockedShowError

beforeEach(() => {
  jest.resetAllMocks()
})

describe('pickPaths', () => {
  it('should not call quickPickManyValues if undefined is provided', async () => {
    mockedQuickPickManyValues.mockResolvedValueOnce([])
    await pickPaths(undefined, Title.SELECT_COLUMNS)

    expect(mockedShowError).toHaveBeenCalledTimes(1)
    expect(mockedQuickPickManyValues).not.toHaveBeenCalled()
  })

  it('should not call quickPickManyValues if no plots paths are provided', async () => {
    mockedQuickPickManyValues.mockResolvedValueOnce([])
    await pickPaths([], Title.SELECT_COLUMNS)

    expect(mockedShowError).toHaveBeenCalledTimes(1)
    expect(mockedQuickPickManyValues).not.toHaveBeenCalled()
  })

  it('should call the quickPick with the correct items', async () => {
    mockedQuickPickManyValues.mockResolvedValueOnce([])
    const revisions = new Set([EXPERIMENT_WORKSPACE_ID])

    const plotPaths = [
      {
        hasChildren: false,
        label: 'loss.tsv',
        parentPath: 'logs',
        path: join('logs', 'loss.tsv'),
        revisions,
        selected: true,
        type: new Set([PathType.TEMPLATE_SINGLE])
      },
      {
        hasChildren: false,
        label: 'acc.tsv',
        parentPath: 'logs',
        path: join('logs', 'acc.tsv'),
        revisions,
        selected: true,
        type: new Set([PathType.TEMPLATE_SINGLE])
      },
      {
        hasChildren: false,
        label: 'fun.tsv',
        parentPath: 'logs',
        path: join('logs', 'fun.tsv'),
        revisions,
        selected: false,
        type: new Set([PathType.TEMPLATE_SINGLE])
      }
    ]

    await pickPaths(plotPaths, Title.SELECT_PLOTS)

    expect(mockedShowError).not.toHaveBeenCalled()
    expect(mockedQuickPickManyValues).toHaveBeenCalledTimes(1)
    expect(mockedQuickPickManyValues).toHaveBeenCalledWith(
      [
        {
          label: join('logs', 'loss.tsv'),
          picked: true,
          value: plotPaths[0]
        },
        {
          label: join('logs', 'acc.tsv'),
          picked: true,
          value: plotPaths[1]
        },
        {
          label: join('logs', 'fun.tsv'),
          picked: false,
          value: plotPaths[2]
        }
      ],
      { title: Title.SELECT_PLOTS }
    )
  })
})
