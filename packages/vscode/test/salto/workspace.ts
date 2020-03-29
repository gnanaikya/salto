/*
*                      Copyright 2020 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
import * as path from 'path'
import { Config, Workspace, parse, file, Errors } from '@salto-io/core'
import { InstanceElement, ElemID, ObjectType, Field, BuiltinTypes, SaltoError } from '@salto-io/adapter-api'
import _ from 'lodash'
import { ParseError } from '@salto-io/core/dist/src/parser/parse'
import { mergeElements } from '@salto-io/core/dist/src/core/merger'
import { SourceMap } from '@salto-io/core/dist/src/parser/internal/types'
import { ConfigSource } from '@salto-io/core/dist/src/workspace/config_source'

const SERVICES = ['salesforce']

const configID = new ElemID(SERVICES[0])
const mockConfigType = new ObjectType({
  elemID: configID,
  fields: {
    username: new Field(configID, 'username', BuiltinTypes.STRING),
  },
})
const mockConfigInstance = new InstanceElement(ElemID.CONFIG_NAME, mockConfigType, {
  username: 'test@test',
})

export const mockErrors = (errors: SaltoError[]): Errors => ({
  all: () => errors,
  hasErrors: () => errors.length !== 0,
  merge: [],
  parse: [],
  validation: errors.map(err => ({ elemID: new ElemID('test'), error: '', ...err })),
  strings: () => errors.map(err => err.message),
})

export const mockFunction = <T extends (...args: never[]) => unknown>():
jest.Mock<ReturnType<T>, Parameters<T>> => jest.fn()

const buildMockWorkspace = (
  blueprint?: string,
  buffer?: string,
  config?: Partial<Config>
): Workspace => {
  const baseDir = blueprint ? path.dirname(blueprint) : 'default_base_dir'
  const filename = blueprint ? path.relative(baseDir, blueprint) : 'default.bp'
  const parseResult = buffer
    ? parse(Buffer.from(buffer), filename)
    : { elements: [], errors: [] as ParseError[], sourceMap: new Map() as SourceMap }
  const merged = mergeElements(parseResult.elements)
  return {
    elements: merged.merged,
    errors: async () => ({
      all: () => parseResult.errors || [],
      strings: () => (parseResult.errors || []).map(err => err.message),
      parse: parseResult.errors || [],
      merge: [],
      validation: [],
      hasErrors: () => (!_.isEmpty(parseResult.errors)),
    }),
    hasErrors: mockFunction<Workspace['hasErrors']>().mockResolvedValue(!_.isEmpty(parseResult.errors)),
    getSourceMap: mockFunction<Workspace['getSourceMap']>().mockResolvedValue(parseResult.sourceMap),
    getSourceRanges: mockFunction<Workspace['getSourceRanges']>().mockImplementation(async elemID =>
      (parseResult.sourceMap.get(elemID.getFullName()) || [])),
    getBlueprint: mockFunction<Workspace['getBlueprint']>().mockResolvedValue({ filename, buffer: buffer ?? '' }),
    config: _.mergeWith(config, { stateLocation: '.', services: SERVICES, baseDir }),
    updateBlueprints: mockFunction<Workspace['updateBlueprints']>(),
    flush: mockFunction<Workspace['flush']>(),
    credentials: {
      get: mockFunction<ConfigSource['get']>().mockResolvedValue(mockConfigInstance),
      set: mockFunction<ConfigSource['set']>().mockResolvedValue(),
    },
    transformError: mockFunction<Workspace['transformError']>().mockImplementation(async err => ({
      ...err,
      sourceFragments: [{
        fragment: '',
        sourceRange: {
          start: { line: 1, col: 1, byte: 1 },
          end: { line: 1, col: 2, byte: 2 },
          filename: 'test.bp',
        },
      }],
    })),
    setBlueprints: mockFunction<Workspace['setBlueprints']>().mockResolvedValue(),
    removeBlueprints: mockFunction<Workspace['removeBlueprints']>().mockResolvedValue(),
    listBlueprints: mockFunction<Workspace['listBlueprints']>().mockResolvedValue([filename]),
    getElements: mockFunction<Workspace['getElements']>().mockResolvedValue(merged.merged),
    clone: mockFunction<Workspace['clone']>().mockImplementation(() => buildMockWorkspace(blueprint, buffer, config)),
  } as unknown as Workspace
}

export const mockWorkspace = async (blueprint?: string, config?: Partial<Config>
): Promise<Workspace> => {
  const buffer = blueprint ? await file.readTextFile(blueprint) : 'blabla'
  return buildMockWorkspace(blueprint, buffer, config)
}
