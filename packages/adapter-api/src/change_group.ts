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
import { Change, isAdditionChange, isRemovalChange, isModificationChange, ChangeDataType, ModificationChange, AdditionChange, RemovalChange } from './change'
import { ChangeId } from './dependency_changer'

export type ChangeGroupId = string

export type ChangeGroup<ChangeType = Change<ChangeDataType>> = {
  groupID: ChangeGroupId
  changes: ReadonlyArray<ChangeType>
}

export type ChangeGroupIdFunction = (changes: Map<ChangeId, Change>) =>
  Promise<Map<ChangeId, ChangeGroupId>>

export const isAdditionGroup = <T>(
  changeGroup: ChangeGroup<Change<T>>
): changeGroup is ChangeGroup<AdditionChange<T>> =>
    (changeGroup.changes.every(change => isAdditionChange(change)))

export const isRemovalGroup = <T>(
  changeGroup: ChangeGroup<Change<T>>
): changeGroup is ChangeGroup<RemovalChange<T>> =>
    (changeGroup.changes.every(change => isRemovalChange(change)))

export const isModificationGroup = <T>(
  changeGroup: ChangeGroup<Change<T>>
): changeGroup is ChangeGroup<ModificationChange<T>> =>
    (changeGroup.changes.every(change => isModificationChange(change)))