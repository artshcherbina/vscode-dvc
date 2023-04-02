import { join } from 'path'
import {
  collectErrors,
  collectImageErrors,
  collectPathErrors,
  Error
} from './collect'
import { Disposable } from '../../class/dispose'
import { DvcError, PlotsOutputOrError } from '../../cli/dvc/contract'
import { isDvcError } from '../../cli/dvc/reader'
import { getCliErrorLabel } from '../../tree'

export class ErrorsModel extends Disposable {
  private readonly dvcRoot: string

  private errors: Error[] = []
  private cliError: { error: string; path: string } | undefined

  constructor(dvcRoot: string) {
    super()
    this.dvcRoot = dvcRoot
  }

  public transformAndSet(
    output: PlotsOutputOrError,
    revs: string[],
    cliIdToLabel: { [id: string]: string }
  ) {
    if (isDvcError(output)) {
      return this.handleCliError(output)
    }

    this.errors = collectErrors(output, revs, this.errors, cliIdToLabel)
    this.cliError = undefined
  }

  public getImageErrors(path: string, revision: string) {
    return collectImageErrors(path, revision, this.errors)
  }

  public getPathErrors(path: string, selectedRevisions: string[]) {
    return collectPathErrors(path, selectedRevisions, this.errors)
  }

  public getErrorPaths(selectedRevisions: string[]) {
    if (this.cliError) {
      return new Set([this.cliError.path])
    }

    const acc = new Set<string>()
    for (const { path, rev } of this.errors) {
      if (selectedRevisions.includes(rev)) {
        acc.add(join(this.dvcRoot, path))
      }
    }
    return acc
  }

  public getRevisionErrors(rev: string) {
    const acc = new Set<string>()
    for (const error of this.errors) {
      if (error.rev === rev) {
        acc.add(error.msg)
      }
    }
    if (acc.size === 0) {
      return undefined
    }

    return [...acc]
  }

  public hasCliError() {
    return !!this.getCliError()
  }

  public getCliError() {
    return this.cliError
  }

  private handleCliError({ error: { msg } }: DvcError) {
    this.errors = []
    this.cliError = {
      error: msg,
      path: join(this.dvcRoot, getCliErrorLabel(msg))
    }
  }
}