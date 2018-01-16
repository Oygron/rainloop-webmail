
import ko from 'ko';

import {StorageResultType, Notification} from 'Common/Enums';
import {i18n, getNotification} from 'Common/Translator';
import {setLabelHash} from 'Common/Cache';

import MessageStore from 'Stores/User/Message';

import Remote from 'Remote/User/Ajax';

import {getApp} from 'Helper/Apps/User';

import {popup, command} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/LabelClear',
	templateID: 'PopupsLabelClear'
})
class LabelClearPopupView extends AbstractViewNext
{
	constructor() {
		super();

		this.selectedLabel = ko.observable(null);
		this.clearingProcess = ko.observable(false);
		this.clearingError = ko.observable('');

		this.labelFullNameForClear = ko.computed(() => {
			const label = this.selectedLabel();
			return label ? label.printableFullName() : '';
		});

		this.labelNameForClear = ko.computed(() => {
			const label = this.selectedLabel();
			return label ? label.localName() : '';
		});

		this.dangerDescHtml = ko.computed(
			() => i18n('POPUPS_CLEAR_FOLDER/DANGER_DESC_HTML_1', {'FOLDER': this.labelNameForClear()})
		);
	}

	@command((self) => {
		const
			label = self.selectedLabel(),
			isClearing = self.clearingProcess();

		return !isClearing && null !== label;
	})
	clearCommand() {

		const labelToClear = this.selectedLabel();
		if (labelToClear)
		{
			MessageStore.message(null);
			MessageStore.messageList([]);

			this.clearingProcess(true);

			labelToClear.messageCountAll(0);
			labelToClear.messageCountUnread(0);

			setLabelHash(labelToClear.fullNameRaw, '');

			Remote.labelClear((result, data) => {

				this.clearingProcess(false);
				if (StorageResultType.Success === result && data && data.Result)
				{
					getApp().reloadMessageList(true);
					this.cancelCommand();
				}
				else
				{
					if (data && data.ErrorCode)
					{
						this.clearingError(getNotification(data.ErrorCode));
					}
					else
					{
						this.clearingError(getNotification(Notification.MailServerError));
					}
				}
			}, labelToClear.fullNameRaw);
		}
	}

	clearPopup() {
		this.clearingProcess(false);
		this.selectedLabel(null);
	}

	onShow(label) {
		this.clearPopup();
		if (label)
		{
			this.selectedLabel(label);
		}
	}
}

export {LabelClearPopupView, LabelClearPopupView as default};
