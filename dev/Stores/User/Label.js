
import ko from 'ko';
import _ from '_';

import {settingsGet} from 'Storage/Settings';

import {LabelType} from 'Common/Enums';
import {UNUSED_OPTION_VALUE} from 'Common/Consts';
import {isArray, labelListOptionsBuilder} from 'Common/Utils';
import {getLabelInboxName, getLabelFromCacheList} from 'Common/Cache';

import {momentNowUnix} from 'Common/Momentor';

class LabelUserStore
{
	constructor() {
		this.displaySpecSetting = ko.observable(true);

		this.sentLabel = ko.observable('');
		this.draftLabel = ko.observable('');
		this.spamLabel = ko.observable('');
		this.trashLabel = ko.observable('');
		this.archiveLabel = ko.observable('');

		this.namespace = '';

		this.labelList = ko.observableArray([]);
		this.labelList.optimized = ko.observable(false);
		this.labelList.error = ko.observable('');

		this.labelsLoading = ko.observable(false);
		this.labelsCreating = ko.observable(false);
		this.labelsDeleting = ko.observable(false);
		this.labelsRenaming = ko.observable(false);

		this.labelsInboxUnreadCount = ko.observable(0);

		this.currentLabel = ko.observable(null).extend({toggleSubscribeProperty: [this, 'selected']});

		this.sieveAllowFileintoInbox = !!settingsGet('SieveAllowFileintoInbox');

		this.computers();
		this.subscribers();
	}

	computers() {

		this.draftLabelNotEnabled = ko.computed(
			() => ('' === this.draftLabel() || UNUSED_OPTION_VALUE === this.draftLabel())
		);

		this.labersListWithSingleInboxRootLabel = ko.computed(
			() => !_.find(this.labelList(), (label) => (label && !label.isSystemLabel() && label.visible()))
		);

		this.currentLabelFullNameRaw = ko.computed(
			() => (this.currentLabel() ? this.currentLabel().fullNameRaw : '')
		);

		this.currentLabelFullName = ko.computed(() => (this.currentLabel() ? this.currentLabel().fullName : ''));
		this.currentLabelFullNameHash = ko.computed(() => (this.currentLabel() ? this.currentLabel().fullNameHash : ''));

		this.labelsChanging = ko.computed(() => {
			const
				loading = this.labelsLoading(),
				creating = this.labelsCreating(),
				deleting = this.labelsDeleting(),
				renaming = this.labelsRenaming();

			return loading || creating || deleting || renaming;
		});

		this.labelListSystemNames = ko.computed(() => {

			const
				list = [getLabelInboxName()],
				labels = this.labelList(),
				sentLabel = this.sentLabel(),
				draftLabel = this.draftLabel(),
				spamLabel = this.spamLabel(),
				trashLabel = this.trashLabel(),
				archiveLabel = this.archiveLabel();

			if (isArray(labels) && 0 < labels.length)
			{
				if ('' !== sentLabel && UNUSED_OPTION_VALUE !== sentLabel)
				{
					list.push(sentLabel);
				}
				if ('' !== draftLabel && UNUSED_OPTION_VALUE !== draftLabel)
				{
					list.push(draftLabel);
				}
				if ('' !== spamLabel && UNUSED_OPTION_VALUE !== spamLabel)
				{
					list.push(spamLabel);
				}
				if ('' !== trashLabel && UNUSED_OPTION_VALUE !== trashLabel)
				{
					list.push(trashLabel);
				}
				if ('' !== archiveLabel && UNUSED_OPTION_VALUE !== archiveLabel)
				{
					list.push(archiveLabel);
				}
			}

			return list;
		});

		this.labelListSystem = ko.computed(
			() => _.compact(_.map(this.labelListSystemNames(), (name) => getLabelFromCacheList(name)))
		);

		this.labelMenuForMove = ko.computed(
			() => labelListOptionsBuilder(
				this.labelListSystem(), this.labelList(),
				[this.currentLabelFullNameRaw()], null, null, null, null, (item) => (item ? item.localName() : ''))
		);

		this.labelMenuForFilters = ko.computed(
			() => labelListOptionsBuilder(
				this.labelListSystem(), this.labelList(),
				[(this.sieveAllowFileintoInbox ? '' : 'INBOX')], [['', '']], null, null, null, (item) => (item ? item.localName() : ''))
		);
	}

	subscribers() {
		const
			fRemoveSystemLabelType = (observable) => () => {
				const label = getLabelFromCacheList(observable());
				if (label)
				{
					label.type(LabelType.User);
				}
			};
		const
			fSetSystemLabelType = (type) => (value) => {
				const label = getLabelFromCacheList(value);
				if (label)
				{
					label.type(type);
				}
			};

		this.sentLabel.subscribe(fRemoveSystemLabelType(this.sentLabel), this, 'beforeChange');
		this.draftLabel.subscribe(fRemoveSystemLabelType(this.draftLabel), this, 'beforeChange');
		this.spamLabel.subscribe(fRemoveSystemLabelType(this.spamLabel), this, 'beforeChange');
		this.trashLabel.subscribe(fRemoveSystemLabelType(this.trashLabel), this, 'beforeChange');
		this.archiveLabel.subscribe(fRemoveSystemLabelType(this.archiveLabel), this, 'beforeChange');

		this.sentLabel.subscribe(fSetSystemLabelType(LabelType.SentItems), this);
		this.draftLabel.subscribe(fSetSystemLabelType(LabelType.Draft), this);
		this.spamLabel.subscribe(fSetSystemLabelType(LabelType.Spam), this);
		this.trashLabel.subscribe(fSetSystemLabelType(LabelType.Trash), this);
		this.archiveLabel.subscribe(fSetSystemLabelType(LabelType.Archive), this);
	}

	/**
	 * @returns {Array}
	 */
	getNextLabelNames() {

		const
			result = [],
			limit = 5,
			utc = momentNowUnix(),
			timeout = utc - 60 * 5,
			timeouts = [],
			inboxLabelName = getLabelInboxName(),
			fSearchFunction = (list) => {
				_.each(list, (label) => {
					if (label && inboxLabelName !== label.fullNameRaw &&
						label.selectable && label.existen && timeout > label.interval &&
						(label.isSystemLabel() || (label.subScribed() && label.checkable()))
					)
					{
						timeouts.push([label.interval, label.fullNameRaw]);
					}

					if (label && 0 < label.subLabels().length)
					{
						fSearchFunction(label.subLabels());
					}
				});
			};

		fSearchFunction(this.labelList());

		timeouts.sort((a, b) => {
			if (a[0] < b[0])
			{
				return -1;
			}
			else if (a[0] > b[0])
			{
				return 1;
			}

			return 0;
		});

		_.find(timeouts, (aItem) => {
			const label = getLabelFromCacheList(aItem[1]);
			if (label)
			{
				label.interval = utc;
				result.push(aItem[1]);
			}

			return limit <= result.length;
		});

		return _.uniq(result);
	}
}

export default new LabelUserStore();
