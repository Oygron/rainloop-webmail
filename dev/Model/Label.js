
import _ from '_';
import ko from 'ko';

import {LabelType} from 'Common/Enums';
import {isPosNumeric} from 'Common/Utils';
import {i18n, trigger as translatorTrigger} from 'Common/Translator';
import {getLabelInboxName} from 'Common/Cache';
import * as Events from 'Common/Events';

import {AbstractModel} from 'Knoin/AbstractModel';

class LabelModel extends AbstractModel
{
	constructor() {
		super('LabelModel');

		this.name = ko.observable('');
		this.fullName = '';
		this.fullNameRaw = '';
		this.fullNameHash = '';
		this.delimiter = '';
		this.namespace = '';
		this.deep = 0;
		this.interval = 0;
		this.color = '000000';

		this.selectable = false;
		this.existen = true;

		this.type = ko.observable(LabelType.User);

		this.focused = ko.observable(false);
		this.selected = ko.observable(false);
		this.edited = ko.observable(false);
		this.subScribed = ko.observable(true);
		this.checkable = ko.observable(false);
		this.subLabels = ko.observableArray([]);
		this.deleteAccess = ko.observable(false);
		this.actionBlink = ko.observable(false).extend({falseTimeout: 1000});

		this.nameForEdit = ko.observable('');

		this.privateMessageCountAll = ko.observable(0);
		this.privateMessageCountUnread = ko.observable(0);

		this.collapsedPrivate = ko.observable(true);
	}

	/**
	 * @static
	 * @param {AjaxJsonLabel} json
	 * @returns {?LabelModel}
	 */
	static newInstanceFromJson(json) {
		const label = new LabelModel();
		return label.initByJson(json) ? label.initComputed() : null;
	}

	/**
	 * @returns {LabelModel}
	 */
	initComputed() {
		const inboxLabelName = getLabelInboxName();

		this.isInbox = ko.computed(() => LabelType.Inbox === this.type());

		this.hasSubScribedSublabels = ko.computed(
			() => !!_.find(this.subLabels(), (oLabel) => (oLabel.subScribed() || oLabel.hasSubScribedSublabels()) && !oLabel.isSystemLabel())
		);

		this.canBeEdited = ko.computed(() => LabelType.User === this.type() && this.existen && this.selectable);

		this.visible = ko.computed(() => {
			const
				isSubScribed = this.subScribed(),
				isSubLabels = this.hasSubScribedSublabels();

			return (isSubScribed || (isSubLabels && (!this.existen || !this.selectable)));
		});

		this.isSystemLabel = ko.computed(() => LabelType.User !== this.type());

		this.hidden = ko.computed(() => {
			const
				isSystem = this.isSystemLabel(),
				isSubLabels = this.hasSubScribedSublabels();

			return (isSystem && !isSubLabels) || (!this.selectable && !isSubLabels);
		});

		this.selectableForLabelList = ko.computed(() => !this.isSystemLabel() && this.selectable);

		this.messageCountAll = ko.computed({
			read: this.privateMessageCountAll,
			write: (iValue) => {
				if (isPosNumeric(iValue, true))
				{
					this.privateMessageCountAll(iValue);
				}
				else
				{
					this.privateMessageCountAll.valueHasMutated();
				}
			}
		}).extend({notify: 'always'});

		this.messageCountUnread = ko.computed({
			read: this.privateMessageCountUnread,
			write: (value) => {
				if (isPosNumeric(value, true))
				{
					this.privateMessageCountUnread(value);
				}
				else
				{
					this.privateMessageCountUnread.valueHasMutated();
				}
			}
		}).extend({notify: 'always'});

		this.printableUnreadCount = ko.computed(() => {
			const
				count = this.messageCountAll(),
				unread = this.messageCountUnread(),
				type = this.type();

			if (0 < count)
			{
				if (LabelType.Draft === type)
				{
					return '' + count;
				}
				else if (0 < unread && LabelType.Trash !== type && LabelType.Archive !== type && LabelType.SentItems !== type)
				{
					return '' + unread;
				}
			}

			return '';
		});

		this.canBeDeleted = ko.computed(() => {
			const bSystem = this.isSystemLabel();
			return !bSystem && 0 === this.subLabels().length && inboxLabelName !== this.fullNameRaw;
		});

		this.canBeSubScribed = ko.computed(() => !this.isSystemLabel() && this.selectable && inboxLabelName !== this.fullNameRaw);

		this.canBeChecked = this.canBeSubScribed;

		this.localName = ko.computed(() => {

			translatorTrigger();

			let name = this.name();
			const type = this.type();

			if (this.isSystemLabel())
			{
				switch (type)
				{
					case LabelType.Inbox:
						name = i18n('FOLDER_LIST/INBOX_NAME');
						break;
					case LabelType.SentItems:
						name = i18n('FOLDER_LIST/SENT_NAME');
						break;
					case LabelType.Draft:
						name = i18n('FOLDER_LIST/DRAFTS_NAME');
						break;
					case LabelType.Spam:
						name = i18n('FOLDER_LIST/SPAM_NAME');
						break;
					case LabelType.Trash:
						name = i18n('FOLDER_LIST/TRASH_NAME');
						break;
					case LabelType.Archive:
						name = i18n('FOLDER_LIST/ARCHIVE_NAME');
						break;
					// no default
				}
			}

			return name;
		});

		this.manageLabelSystemName = ko.computed(() => {

			translatorTrigger();

			let suffix = '';
			const
				type = this.type(),
				name = this.name();

			if (this.isSystemLabel())
			{
				switch (type)
				{
					case LabelType.Inbox:
						suffix = '(' + i18n('FOLDER_LIST/INBOX_NAME') + ')';
						break;
					case LabelType.SentItems:
						suffix = '(' + i18n('FOLDER_LIST/SENT_NAME') + ')';
						break;
					case LabelType.Draft:
						suffix = '(' + i18n('FOLDER_LIST/DRAFTS_NAME') + ')';
						break;
					case LabelType.Spam:
						suffix = '(' + i18n('FOLDER_LIST/SPAM_NAME') + ')';
						break;
					case LabelType.Trash:
						suffix = '(' + i18n('FOLDER_LIST/TRASH_NAME') + ')';
						break;
					case LabelType.Archive:
						suffix = '(' + i18n('FOLDER_LIST/ARCHIVE_NAME') + ')';
						break;
					// no default
				}
			}

			if ('' !== suffix && '(' + name + ')' === suffix || '(inbox)' === suffix.toLowerCase())
			{
				suffix = '';
			}

			return suffix;
		});

		this.collapsed = ko.computed({
			read: () => !this.hidden() && this.collapsedPrivate(),
			write: (value) => {
				this.collapsedPrivate(value);
			}
		});

		this.hasUnreadMessages = ko.computed(() => 0 < this.messageCountUnread() && '' !== this.printableUnreadCount());

		this.hasSubScribedUnreadMessagesSublabels = ko.computed(
			() => !!_.find(this.subLabels(), (label) => label.hasUnreadMessages() || label.hasSubScribedUnreadMessagesSublabels())
		);

		// subscribe
		this.name.subscribe((value) => {
			this.nameForEdit(value);
		});

		this.edited.subscribe((value) => {
			if (value)
			{
				this.nameForEdit(this.name());
			}
		});

		this.messageCountUnread.subscribe((unread) => {
			if (LabelType.Inbox === this.type())
			{
				Events.pub('mailbox.inbox-unread-count', [unread]);
			}
		});

		return this;
	}

	/**
	 * @returns {string}
	 */
	collapsedCss() {
		return this.hasSubScribedSublabels() ?
			(this.collapsed() ? 'icon-right-mini e-collapsed-sign' : 'icon-down-mini e-collapsed-sign') : 'icon-none e-collapsed-sign';
	}

	/**
	 * @param {AjaxJsonLabel} json
	 * @returns {boolean}
	 */
	initByJson(json) {
		let bResult = false;
		const sInboxLabelName = getLabelInboxName();

		if (json && 'Object/Label' === json['@Object'])
		{
			this.name(json.Name);
			this.delimiter = json.Delimiter;
			this.fullName = json.FullName;
			this.fullNameRaw = json.FullNameRaw;
			this.fullNameHash = json.FullNameHash;
			this.deep = json.FullNameRaw.split(this.delimiter).length - 1;
			this.selectable = !!json.IsSelectable;
			this.existen = !!json.IsExists;

			this.subScribed(!!json.IsSubscribed);
			this.checkable(!!json.Checkable);

			this.type(sInboxLabelName === this.fullNameRaw ? LabelType.Inbox : LabelType.User);

			bResult = true;
		}

		return bResult;
	}

	/**
	 * @returns {string}
	 */
	printableFullName() {
		return this.fullName.split(this.delimiter).join(' / ');
	}
}

export {LabelModel, LabelModel as default};
