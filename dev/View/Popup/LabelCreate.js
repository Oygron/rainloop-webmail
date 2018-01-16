
import ko from 'ko';

import {Notification} from 'Common/Enums';
import {UNUSED_OPTION_VALUE} from 'Common/Consts';
import {bMobileDevice} from 'Common/Globals';
import {trim, defautOptionsAfterRender, labelListOptionsBuilder} from 'Common/Utils';

import LabelStore from 'Stores/User/Label';

import Promises from 'Promises/User/Ajax';

import {getApp} from 'Helper/Apps/User';

import {popup, command} from 'Knoin/Knoin';
import {AbstractViewNext} from 'Knoin/AbstractViewNext';

@popup({
	name: 'View/Popup/LabelCreate',
	templateID: 'PopupsLabelCreate'
})
class LabelCreateView extends AbstractViewNext
{
	constructor() {
		super();

		this.labelName = ko.observable('');
		this.labelName.focused = ko.observable(false);

		this.selectedParentValue = ko.observable(UNUSED_OPTION_VALUE);

		this.parentLabelSelectList = ko.computed(() => {

			const
				top = [],
				list = LabelStore.labelList(),
				fRenameCallback = (oItem) => (oItem ? (oItem.isSystemLabel() ? oItem.name() + ' ' + oItem.manageLabelSystemName() : oItem.name()) : '');

			top.push(['', '']);

			let fDisableCallback = null;
			if ('' !== LabelStore.namespace)
			{
				fDisableCallback = (item) => LabelStore.namespace !== item.fullNameRaw.substr(0, LabelStore.namespace.length);
			}

			return labelListOptionsBuilder([], list, [], top, null, fDisableCallback, null, fRenameCallback);

		});

		this.defautOptionsAfterRender = defautOptionsAfterRender;
	}

	@command((self) => self.simpleLabelNameValidation(self.labelName()))
	createLabelCommand() {

		let parentLabelName = this.selectedParentValue();
		if ('' === parentLabelName && 1 < LabelStore.namespace.length)
		{
			parentLabelName = LabelStore.namespace.substr(0, LabelStore.namespace.length - 1);
		}

		getApp().labelsPromisesActionHelper(
			Promises.labelCreate(this.labelName(), parentLabelName, LabelStore.labelsCreating),
			Notification.CantCreateLabel
		);

		this.cancelCommand();
	}

	simpleLabelNameValidation(sName) {
		return (/^[^\\\/]+$/g).test(trim(sName));
	}

	clearPopup() {
		this.labelName('');
		this.selectedParentValue('');
		this.labelName.focused(false);
	}

	onShow() {
		this.clearPopup();
	}

	onShowWithDelay() {
		if (!bMobileDevice)
		{
			this.labelName.focused(true);
		}
	}
}

export {LabelCreateView, LabelCreateView as default};
