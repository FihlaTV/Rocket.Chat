import mem from 'mem';
import s from 'underscore.string';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Tracker } from 'meteor/tracker';
import { HTML } from 'meteor/htmljs';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Session } from 'meteor/session';
import toastr from 'toastr';

import { KonchatNotification } from '../app/ui';
import { ChatSubscription } from '../app/models';
import { roomTypes, handleError } from '../app/utils';
import { call } from '../app/ui-utils';
import { createTemplateForComponent } from './createTemplateForComponent';

const getRoomById = mem((rid) => call('getRoomById', rid));

FlowRouter.goToRoomById = async (rid) => {
	if (!rid) {
		return;
	}
	const subscription = ChatSubscription.findOne({ rid });
	if (subscription) {
		return roomTypes.openRouteLink(subscription.t, subscription, FlowRouter.current().queryParams);
	}

	const room = await getRoomById(rid);
	return roomTypes.openRouteLink(room.t, room, FlowRouter.current().queryParams);
};


BlazeLayout.setRoot('body');

FlowRouter.route('/', {
	name: 'index',
	action() {
		BlazeLayout.render('main', { center: 'loading' });
		if (!Meteor.userId()) {
			return FlowRouter.go('home');
		}

		Tracker.autorun(function(c) {
			if (FlowRouter.subsReady() === true) {
				Meteor.defer(function() {
					if (Meteor.user() && Meteor.user().defaultRoom) {
						const room = Meteor.user().defaultRoom.split('/');
						FlowRouter.go(room[0], { name: room[1] }, FlowRouter.current().queryParams);
					} else {
						FlowRouter.go('home');
					}
				});
				c.stop();
			}
		});
	},
});

FlowRouter.route('/login', {
	name: 'login',

	action() {
		FlowRouter.go('home');
	},
});

FlowRouter.route('/home', {
	name: 'home',

	action(params, queryParams) {
		KonchatNotification.getDesktopPermission();
		if (queryParams.saml_idp_credentialToken !== undefined) {
			Accounts.callLoginMethod({
				methodArguments: [{
					saml: true,
					credentialToken: queryParams.saml_idp_credentialToken,
				}],
				userCallback(error) {
					if (error) {
						if (error.reason) {
							toastr.error(error.reason);
						} else {
							handleError(error);
						}
					}
					BlazeLayout.render('main', { center: 'home' });
				},
			});
		} else {
			BlazeLayout.render('main', { center: 'home' });
		}
	},
});

FlowRouter.route('/directory/:tab?', {
	name: 'directory',

	async action() {
		const { DirectoryPage } = await require('../app/ui/client/views/app/components/Directory');
		BlazeLayout.render('main', { center: await createTemplateForComponent(DirectoryPage, { }, () => HTML.DIV({ style }), 'directory')}); // eslint-disable-line
	},
	triggersExit: [function() {
		$('.main-content').addClass('rc-old');
	}],
});

FlowRouter.route('/account/:group?', {
	name: 'account',

	async action(params) {
		if (!params.group) {
			params.group = 'Profile';
		}
		const { Input } = await require('../client/components/admin/settings/inputs/StringSettingInput');
		console.log(await createTemplateForComponent(Input, { }, () => HTML.DIV({ style }))); // eslint-disable-line
		params.group = s.capitalize(params.group, true);
		BlazeLayout.render('main', { center: `account${ params.group }` });
	},
	triggersExit: [function() {
		$('.main-content').addClass('rc-old');
	}],
});

FlowRouter.route('/terms-of-service', {
	name: 'terms-of-service',

	action() {
		Session.set('cmsPage', 'Layout_Terms_of_Service');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/privacy-policy', {
	name: 'privacy-policy',

	action() {
		Session.set('cmsPage', 'Layout_Privacy_Policy');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/legal-notice', {
	name: 'legal-notice',

	action() {
		Session.set('cmsPage', 'Layout_Legal_Notice');
		BlazeLayout.render('cmsPage');
	},
});

FlowRouter.route('/room-not-found/:type/:name', {
	name: 'room-not-found',

	action(params) {
		Session.set('roomNotFound', { type: params.type, name: params.name });
		BlazeLayout.render('main', { center: 'roomNotFound' });
	},
});

FlowRouter.route('/register/:hash', {
	name: 'register-secret-url',

	action(/* params*/) {
		BlazeLayout.render('secretURL');

		// if RocketChat.settings.get('Accounts_RegistrationForm') is 'Secret URL'
		// 	Meteor.call 'checkRegistrationSecretURL', params.hash, (err, success) ->
		// 		if success
		// 			Session.set 'loginDefaultState', 'register'
		// 			BlazeLayout.render 'main', {center: 'home'}
		// 			KonchatNotification.getDesktopPermission()
		// 		else
		// 			BlazeLayout.render 'logoLayout', { render: 'invalidSecretURL' }
		// else
		// 	BlazeLayout.render 'logoLayout', { render: 'invalidSecretURL' }
	},
});

FlowRouter.route('/invite/:hash', {
	name: 'invite',

	action(/* params */) {
		BlazeLayout.render('invite');
	},
});

FlowRouter.route('/setup-wizard/:step?', {
	name: 'setup-wizard',
	action: async () => {
		const { SetupWizardRoute } = await import('./components/setupWizard/SetupWizardRoute');
		BlazeLayout.render(await createTemplateForComponent(SetupWizardRoute));
	},
});

const style = 'overflow: hidden; flex: 1 1 auto; height: 1%;';

FlowRouter.route('/admin/:group?', {
	name: 'admin',
	action: async ({ group = 'info' } = {}) => {
		switch (group) {
			case 'info': {
				const { InformationRoute } = await import('./components/admin/info/InformationRoute');
				BlazeLayout.render('main', { center: await createTemplateForComponent(InformationRoute, { }, () => HTML.DIV({ style })) }); // eslint-disable-line
				break;
			}

			default: {
				const { SettingsRoute } = await import('./components/admin/settings/SettingsRoute');
				BlazeLayout.render('main', { center: await createTemplateForComponent(SettingsRoute, { group }, () => HTML.DIV({ style })) }); // eslint-disable-line
				// BlazeLayout.render('main', { center: 'admin' });
			}
		}
	},
});

FlowRouter.notFound = {
	action: async () => {
		const { PageNotFound } = await import('./components/pageNotFound/PageNotFound');
		BlazeLayout.render(await createTemplateForComponent(PageNotFound));
	},
};
