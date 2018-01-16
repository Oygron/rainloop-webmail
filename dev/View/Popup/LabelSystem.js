
import _ from '_';
import ko from 'ko';

import {SetSystemLabelsNotification, Magics} from 'Common/Enums';
import {UNUSED_OPTION_VALUE} from 'Common/Consts';
import {labelListOptionsBuilder, noop, defautOptionsAfterRender} from 'Common/Utils';
import {initOnStartOrLangChange, i18n} from 'Common/Translator';

import LabelStore from 'Stores/User/Label';

import * as Settings from 'Storage/Settings';
import Remote from 'Remote/User/Ajax';

import {popup} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/LabelSystem',
	templateID: 'PopupsLabelSystem'
})
class LabelSystemPopupView extends AbstractViewNext
{
	constructor() {
		super();

		this.sChooseOnText = '';
		this.sUnuseText = '';

		initOnStartOrLangChange(() => {
			this.sChooseOnText = i18n('POPUPS_SYSTEM_FOLDERS/SELECT_CHOOSE_ONE');
			this.sUnuseText = i18n('POPUPS_SYSTEM_FOLDERS/SELECT_UNUSE_NAME');
		});

		this.notification = ko.observable('');

		this.labelSelectList = ko.computed(
			() => labelListOptionsBuilder([], LabelStore.labelList(), LabelStore.labelListSystemNames(), [
				['', this.sChooseOnText], [UNUSED_OPTION_VALUE, this.sUnuseText]
			], null, null, null, null, null, true)
		);

		this.sentLabel = LabelStore.sentLabel;
		this.draftLabel = LabelStore.draftLabel;
		this.spamLabel = LabelStore.spamLabel;
		this.trashLabel = LabelStore.trashLabel;
		this.archiveLabel = LabelStore.archiveLabel;

		const
			fSetSystemLabels = () => {
				Settings.settingsSet('SentLabel', LabelStore.sentLabel());
				Settings.settingsSet('DraftLabel', LabelStore.draftLabel());
				Settings.settingsSet('SpamLabel', LabelStore.spamLabel());
				Settings.settingsSet('TrashLabel', LabelStore.trashLabel());
				Settings.settingsSet('ArchiveLabel', LabelStore.archiveLabel());
			},
			fSaveSystemLabels = _.debounce(
				() => {
					fSetSystemLabels();
					Remote.saveSystemLabels(noop, {
						SentLabel: LabelStore.sentLabel(),
						DraftLabel: LabelStore.draftLabel(),
						SpamLabel: LabelStore.spamLabel(),
						TrashLabel: LabelStore.trashLabel(),
						ArchiveLabel: LabelStore.archiveLabel(),
						NullLabel: 'NullLabel'
					});
				},
				Magics.Time1s
			),
			fCallback = () => {
				fSetSystemLabels();
				fSaveSystemLabels();
			};

		LabelStore.sentLabel.subscribe(fCallback);
		LabelStore.draftLabel.subscribe(fCallback);
		LabelStore.spamLabel.subscribe(fCallback);
		LabelStore.trashLabel.subscribe(fCallback);
		LabelStore.archiveLabel.subscribe(fCallback);

		this.defautOptionsAfterRender = defautOptionsAfterRender;
	}

	/**
	 * @param {number=} notificationType = SetSystemLabelsNotification.None
	 */
	onShow(notificationType = SetSystemLabelsNotification.None) {

		let notification = '';
		switch (notificationType)
		{
			case SetSystemLabelsNotification.Sent:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SENT');
				break;
			case SetSystemLabelsNotification.Draft:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_DRAFTS');
				break;
			case SetSystemLabelsNotification.Spam:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_SPAM');
				break;
			case SetSystemLabelsNotification.Trash:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_TRASH');
				break;
			case SetSystemLabelsNotification.Archive:
				notification = i18n('POPUPS_SYSTEM_FOLDERS/NOTIFICATION_ARCHIVE');
				break;
			// no default
		}

		this.notification(notification);
	}
}

export {LabelSystemPopupView, LabelSystemPopupView as default};
