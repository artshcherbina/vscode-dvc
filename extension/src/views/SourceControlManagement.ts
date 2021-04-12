import { Disposable } from '@hediet/std/disposable'
import { scm, SourceControlResourceGroup, Uri } from 'vscode'
import { makeObservable, observable } from 'mobx'
import { basename, extname } from 'path'

export type SourceControlManagementState = {
  [key in Status]: Set<string>
}

enum Status {
  DELETED = 'deleted',
  MODIFIED = 'modified',
  NEW = 'new',
  NOT_IN_CACHE = 'notInCache',
  UNTRACKED = 'untracked'
}

type ResourceState = { resourceUri: Uri; contextValue: Status }
export class SourceControlManagement {
  public readonly dispose = Disposable.fn()

  @observable
  private resourceGroup: SourceControlResourceGroup

  public setResourceStates(state: SourceControlManagementState) {
    const reduceResourceStates = (
      resourceStates: ResourceState[],
      entry: [string, Set<string>]
    ): ResourceState[] => {
      const [s, resources] = entry
      return [
        ...resourceStates,
        ...this.getResourceStates(s as Status, resources)
      ]
    }

    this.resourceGroup.resourceStates = Object.entries(state).reduce(
      reduceResourceStates,
      []
    )
  }

  private getResourceStates(
    contextValue: Status,
    paths: Set<string>
  ): ResourceState[] {
    return [...paths]
      .filter(
        path => extname(path) !== '.dvc' && basename(path) !== '.gitignore'
      )
      .map(path => ({
        resourceUri: Uri.file(path),
        contextValue
      }))
  }

  constructor(repositoryRoot: string, state: SourceControlManagementState) {
    makeObservable(this)

    const scmView = this.dispose.track(
      scm.createSourceControl('dvc', 'DVC', Uri.file(repositoryRoot))
    )
    scmView.acceptInputCommand = {
      command: 'workbench.action.output.toggleOutput',
      title: 'foo'
    }

    scmView.inputBox.visible = false

    this.resourceGroup = this.dispose.track(
      scmView.createResourceGroup('group1', 'Changes')
    )

    this.setResourceStates(state)
  }
}
