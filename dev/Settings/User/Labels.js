
import ko from 'ko';

import {ClientSideKeyName, Notification, Magics} from 'Common/Enums';
import {trim, noop} from 'Common/Utils';
import {getNotification, i18n} from 'Common/Translator';

import {removeLabelFromCacheList} from 'Common/Cache';

import {appSettingsGet} from 'Storage/Settings';
import * as Local from 'Storage/Client';

import LabelStore from 'Stores/User/Label';

import Promises from 'Promises/User/Ajax';
import Remote from 'Remote/User/Ajax';

import {getApp} from 'Helper/Apps/User';

import {showScreenPopup} from 'Knoin/Knoin';

class LabelsUserSettings
{
	constructor() {
		this.displaySpecSetting = LabelStore.displaySpecSetting;
		this.labelList = LabelStore.labelList;

		this.labelListHelp = ko.observable('').extend({throttle: Magics.Time100ms});

		this.loading = ko.computed(() => {
			const
				loading = LabelStore.labelsLoading(),
				creating = LabelStore.labelsCreating(),
				deleting = LabelStore.labelsDeleting(),
				renaming = LabelStore.labelsRenaming();

			return loading || creating || deleting || renaming;
		});

		this.labelForDeletion = ko.observable(null).deleteAccessHelper();

		this.labelForEdit = ko.observable(null).extend({toggleSubscribeProperty: [this, 'edited']});

		this.useImapSubscribe = !!appSettingsGet('useImapSubscribe');
	}

	labelEditOnEnter(label) {
		const nameToEdit = label ? trim(label.nameForEdit()) : '';

		if ('' !== nameToEdit && label.name() !== nameToEdit)
		{
			Local.set(ClientSideKeyName.LabelsLashHash, '');

			getApp().labelsPromisesActionHelper(
				Promises.labelRename(label.fullNameRaw, nameToEdit, LabelStore.labelsRenaming),
				Notification.CantRenameLabel
			);

			removeLabelFromCacheList(label.fullNameRaw);

			label.name(nameToEdit);
		}

		label.edited(false);
	}

	labelEditOnEsc(label) {
		if (label)
		{
			label.edited(false);
		}
	}

	onShow() {
		LabelStore.labelList.error('');
	}

	onBuild(oDom) {
		oDom
			.on('mouseover', '.delete-label-parent', () => {
				this.labelListHelp(i18n('SETTINGS_FOLDERS/HELP_DELETE_FOLDER'));
			})
			.on('mouseover', '.subscribe-label-parent', () => {
				this.labelListHelp(i18n('SETTINGS_FOLDERS/HELP_SHOW_HIDE_FOLDER'));
			})
			.on('mouseover', '.check-label-parent', () => {
				this.labelListHelp(i18n('SETTINGS_FOLDERS/HELP_CHECK_FOR_NEW_MESSAGES'));
			})
			.on('mouseout', '.subscribe-label-parent, .check-label-parent, .delete-label-parent', () => {
				this.labelListHelp('');
			});
	}

	createLabel() {
		showScreenPopup(require('View/Popup/LabelCreate'));
	}

	systemLabel() {
		showScreenPopup(require('View/Popup/LabelSystem'));
	}

	deleteLabel(labelToRemove) {
		if (labelToRemove && labelToRemove.canBeDeleted() && labelToRemove.deleteAccess() &&
			0 === labelToRemove.privateMessageCountAll())
		{
			this.labelForDeletion(null);

			if (labelToRemove)
			{
				const
					fRemoveLabel = function(label) {
						if (labelToRemove === label)
						{
							return true;
						}
						label.subLabels.remove(fRemoveLabel);
						return false;
					};

				Local.set(ClientSideKeyName.LabelsLashHash, '');

				LabelStore.labelList.remove(fRemoveLabel);

				getApp().labelsPromisesActionHelper(
					Promises.labelDelete(labelToRemove.fullNameRaw, LabelStore.labelsDeleting),
					Notification.CantDeleteLabel
				);

				removeLabelFromCacheList(labelToRemove.fullNameRaw);
			}
		}
		else if (0 < labelToRemove.privateMessageCountAll())
		{
			LabelStore.labelList.error(getNotification(Notification.CantDeleteNonEmptyLabel));
		}
	}

	subscribeLabel(label) {
		Local.set(ClientSideKeyName.LabelsLashHash, '');
		Remote.labelSetSubscribe(noop, label.fullNameRaw, true);
		label.subScribed(true);
	}

	unSubscribeLabel(label) {
		Local.set(ClientSideKeyName.LabelsLashHash, '');
		Remote.labelSetSubscribe(noop, label.fullNameRaw, false);
		label.subScribed(false);
	}

	checkableTrueLabel(label) {
		Remote.labelSetCheckable(noop, label.fullNameRaw, true);
		label.checkable(true);
	}

	checkableFalseLabel(label) {
		Remote.labelSetCheckable(noop, label.fullNameRaw, false);
		label.checkable(false);
	}
}

export {LabelsUserSettings, LabelsUserSettings as default};
