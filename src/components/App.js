﻿/*
    StarTrekTimelinesSpreadsheet - A tool to help with crew management in Star Trek Timelines
    Copyright (C) 2017 IAmPicard

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
import '../assets/css/App.css';
import React from 'react';
import { Fabric } from 'office-ui-fabric-react/lib/Fabric';
import { CommandBar } from 'office-ui-fabric-react/lib/CommandBar';
import { Spinner, SpinnerSize } from 'office-ui-fabric-react/lib/Spinner';
import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { ContextualMenuItemType } from 'office-ui-fabric-react/lib/ContextualMenu';
import { Image } from 'office-ui-fabric-react/lib/Image';
import { Callout } from 'office-ui-fabric-react/lib/Callout';
import { PrimaryButton, DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { Checkbox } from 'office-ui-fabric-react/lib/Checkbox';
import { TooltipHost, TooltipDelay, DirectionalHint } from 'office-ui-fabric-react/lib/Tooltip';
import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import createHistory from 'history/createBrowserHistory';

// #!if ENV === 'electron'
import { FileImageCache } from '../utils/fileImageCache.js';
// #!else
import { ServerImageProvider } from '../utils/serverImageCache.js';
// #!endif

// #!if ENV === 'electron'
import { LoginDialog } from './LoginDialog.js';
// #!else
import { WebLoginDialog } from './WebLoginDialog.js';
// #!endif

import { ShipList } from './ShipList.js';
import { ItemPage } from './ItemPage.js';
import { CrewPage } from './CrewPage.js';
import { GauntletHelper } from './GauntletHelper.js';
import { MissionExplorer } from './MissionExplorer.js';
import { CrewRecommendations } from './CrewRecommendations.js';
import { AboutAndHelp } from './AboutAndHelp.js';
import { FleetDetails } from './FleetDetails.js';
import { EquipmentDetails } from './EquipmentDetails.js';
import { CaptainCard } from './CaptainCard.js';
import { VoyageTools } from './VoyageTools.js';
import { NeededEquipment } from './NeededEquipment.js';
import { CrewDuplicates } from './CrewDuplicates.js';
import { IncompleteMissions } from './IncompleteMissions.js';

import STTApi from 'sttapi';
import { loginSequence } from 'sttapi';
import { createIssue } from '../utils/githubUtils';
import { openShellExternal, getAppVersion } from '../utils/pal';

import { loadTheme, ColorClassNames } from '@uifabric/styling';

// #!if ENV === 'electron'
import { rcompare } from 'semver';
// #!endif

class App extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			showSpinner: false,
			dataLoaded: false,
			isCaptainCalloutVisible: false,
			showLoginDialog: false,
			captainName: 'Welcome!',
			captainAvatarUrl: '',
			captainAvatarBodyUrl: '',
			spinnerLabel: 'Loading...',
			hideErrorDialog: true,
			hideBootMessage: true,
			showBootMessage: false,
			errorMessage: '',
			updateUrl: undefined,
			theme: undefined,
			motd: undefined,
			darkTheme: false
		};

		this.history = createHistory();
		this.history.listen(location => {
			this._switchTab(location.hash.substr(1));
		});

		this._captainButtonElement = React.createRef();
		this._onAccessToken = this._onAccessToken.bind(this);
		this._onLogout = this._onLogout.bind(this);
		this._onRefresh = this._onRefresh.bind(this);
		this._onCaptainClicked = this._onCaptainClicked.bind(this);
		this._onCaptainCalloutDismiss = this._onCaptainCalloutDismiss.bind(this);
		this._onDataFinished = this._onDataFinished.bind(this);
		this._onDataError = this._onDataError.bind(this);
		this._playerResync = this._playerResync.bind(this);
		this._onSwitchTheme = this._onSwitchTheme.bind(this);
		this._onDismissBootMessage = this._onDismissBootMessage.bind(this);

		this._getNavItems = this._getNavItems.bind(this);
		this._getNavOverflowItems = this._getNavOverflowItems.bind(this);
		this._getNavFarItems = this._getNavFarItems.bind(this);
		this._switchTab = this._switchTab.bind(this);
		this.renderItem = this.renderItem.bind(this);

		initializeIcons(/* optional base url */);

		// #!if ENV === 'electron'
		STTApi.inWebMode = false;
		STTApi.setImageProvider(true, new FileImageCache());
		// #!else
		STTApi.inWebMode = true;

		const serverAddress = 'https://iampicard.com/';
		STTApi.setImageProviderOverride(new ServerImageProvider(serverAddress));
		STTApi.networkHelper.setProxy(serverAddress + 'proxy');
		// #!endif

		STTApi.config.where('key').equals('ui.darkTheme').first().then((entry) => {
			this.setState({ darkTheme: !entry || entry.value || (entry.value === undefined) });

			this._onSwitchTheme(true);
		});

		STTApi.loginWithCachedAccessToken().then((success) => {
			if (success) {
				this.setState({ showSpinner: true, showLoginDialog: false });
				this._onAccessToken();
			}
			else {
				this.setState({ showLoginDialog: true });
			}
		});

		this._onSwitchTheme(false);
	}

	_onSwitchTheme(shouldForceUpdate) {
		const darkThemePalette = {
			"themePrimary": "#0078d7",
			"themeLighterAlt": "#00080f",
			"themeLighter": "#001527",
			"themeLight": "#00335d",
			"themeTertiary": "#0058a1",
			"themeSecondary": "#0071cd",
			"themeDarkAlt": "#0086f4",
			"themeDark": "#42aaff",
			"themeDarker": "#5cb6ff",
			"neutralLighterAlt": "#001222",
			"neutralLighter": "#001d36",
			"neutralLight": "#002d55",
			"neutralQuaternaryAlt": "#003868",
			"neutralQuaternary": "#004078",
			"neutralTertiaryAlt": "#0063ba",
			"neutralTertiary": "#dee1e4",
			"neutralSecondary": "#e3e6e8",
			"neutralPrimaryAlt": "#e9ebed",
			"neutralPrimary": "#ced3d7",
			"neutralDark": "#f4f5f6",
			"black": "#f9fafa",
			"white": "#00070d",
			"primaryBackground": "#00070d",
			"primaryText": "#ced3d7",
			"bodyBackground": "#00070d",
			"bodyText": "#ced3d7",
			"disabledBackground": "#001d36",
			"disabledText": "#0063ba"
		};

		const lightThemePalette = {
			"themePrimary": "#0078d7",
			"themeLighterAlt": "#eff6fc",
			"themeLighter": "#deecf9",
			"themeLight": "#c7e0f4",
			"themeTertiary": "#71afe5",
			"themeSecondary": "#2b88d8",
			"themeDarkAlt": "#106ebe",
			"themeDark": "#005a9e",
			"themeDarker": "#004578",
			"neutralLighterAlt": "#f8f8f8",
			"neutralLighter": "#f4f4f4",
			"neutralLight": "#eaeaea",
			"neutralQuaternaryAlt": "#dadada",
			"neutralQuaternary": "#d0d0d0",
			"neutralTertiaryAlt": "#c8c8c8",
			"neutralTertiary": "#a6a6a6",
			"neutralSecondary": "#666666",
			"neutralPrimaryAlt": "#3c3c3c",
			"neutralPrimary": "#333",
			"neutralDark": "#212121",
			"black": "#1c1c1c",
			"white": "#fff",
			"primaryBackground": "#fff",
			"primaryText": "#333",
			"bodyBackground": "#fff",
			"bodyText": "#333",
			"disabledBackground": "#f4f4f4",
			"disabledText": "#c8c8c8"
		};

		let finalTheme;

		// Current theme
		if (this.state.darkTheme) {
			finalTheme = loadTheme({ palette: darkThemePalette });
		} else {
			finalTheme = loadTheme({ palette: lightThemePalette });
		}

		const root = document.querySelector('.App-content');
		if (root) {
			root.style.backgroundColor = finalTheme.semanticColors.bodyBackground;
			root.style.color = finalTheme.semanticColors.bodyText;
		}

		document.body.style.backgroundColor = finalTheme.semanticColors.bodyBackground;
		document.body.style.color = finalTheme.semanticColors.bodyText;

		if (shouldForceUpdate) {
			this.setState({ theme: finalTheme });
			STTApi.config.put({ key: 'ui.darkTheme', value: this.state.darkTheme });
			this.forceUpdate();
		} else {
			this.state.theme = finalTheme;
		}
	}

	_onDismissBootMessage() {
		STTApi.config.put({ key: 'ui.showBootMessage' + getAppVersion(), value: this.state.showBootMessage });

		this.setState({ hideBootMessage: true });
	}

	_onCaptainClicked() {
		if (!STTApi.loggedIn) {
			this._onLogout();
			return;
		}

		if (!this.state.showSpinner)
			this.setState({ isCaptainCalloutVisible: !this.state.isCaptainCalloutVisible });
	}

	_onCaptainCalloutDismiss() {
		this.setState({
			isCaptainCalloutVisible: false
		});
	}

	componentDidMount() {
		this.intervalPlayerResync = setInterval(this._playerResync, 5 * 60 * 1000);
		this._switchTab('Crew');
	}

	componentWillUnmount() {
		clearInterval(this.intervalPlayerResync);
	}

	_playerResync() {
		// Every 5 minutes, refresh the player currency data (the number of merits, chronitons, etc.)
		if (this.state.dataLoaded) {
			STTApi.resyncPlayerCurrencyData();
		}
	}

	render() {
		if (this.state.showSpinner) {
			return <Spinner size={SpinnerSize.large} label={this.state.spinnerLabel} />;
		}

		return (
			<Fabric style={{ color: this.state.theme.semanticColors.bodyText, backgroundColor: this.state.theme.semanticColors.bodyBackground }} className='App'>
				<div style={{ display: 'flex', flexFlow: 'column', height: '100%', padding: '3px' }}>
					<div style={{ flex: '1 1 auto' }}>
						{this.state.dataLoaded && <CommandBar items={this._getNavItems()} overflowItems={this._getNavOverflowItems()} farItems={this.state.extraCommandItems} />}
					</div>
					<div style={{ flex: '0 1 auto' }}>
						{this.renderItem()}
					</div>
				</div>

				<Dialog
					hidden={this.state.hideErrorDialog}
					onDismiss={() => { this.setState({ hideErrorDialog: true }); }}
					dialogContentProps={{
						type: DialogType.normal,
						title: 'An error occured while loading data!',
						subText: 'Try restarting the application; if the error persists, please log a bug. Details: ' + this.state.errorMessage
					}}
					modalProps={{ isBlocking: true }}
				>
					<DialogFooter>
						<PrimaryButton onClick={() => { createIssue(false, this.state.errorMessage); }} text='Create bug report' />
						<DefaultButton onClick={() => { this.setState({ hideErrorDialog: true }); }} text='Cancel' />
					</DialogFooter>
				</Dialog>

				<Dialog
					hidden={this.state.hideBootMessage}
					onDismiss={() => { this._onDismissBootMessage(); }}
					dialogContentProps={{
						type: DialogType.normal,
						title: 'Please read me',
						subText: 'Star Trek Timelines is not designed to be accessed on multiple clients simultaneously!'
					}}
					modalProps={{ isBlocking: true }}
				>
					<div>
						<p>In order to avoid synchronization issues, please only have <b>one active client at a time</b> (this includes the game on any platform and/or the tool). Close / shut down all other clients, or restart them upon making changes somewhere else.</p>
						<p><i>Note:</i>If you're only using the tool to look at stats (and are ok with potentially out of date info), and don't use the Gauntlet or Voyage features, you can keep it running alongside the game.</p>

						<Checkbox checked={!this.state.showBootMessage} label="Don't show again"
							onChange={(e, isChecked) => { this.setState({ showBootMessage: !isChecked }); }}
						/>

						<br />
					</div>
					<DialogFooter>
						<PrimaryButton onClick={() => { openShellExternal('https://github.com/IAmPicard/StarTrekTimelinesSpreadsheet/blob/master/README.md'); }} text='Read more...' />
						<DefaultButton onClick={() => { this._onDismissBootMessage(); }} text='Ok' />
					</DialogFooter>
				</Dialog>

				{/* #!if ENV === 'electron' */}
				<LoginDialog ref='loginDialog' onAccessToken={this._onAccessToken} shownByDefault={this.state.showLoginDialog} />
				{/* #!else */}
				<WebLoginDialog ref='loginDialog' onAccessToken={this._onAccessToken} shownByDefault={this.state.showLoginDialog} />
				{/* #!endif */}
			</Fabric>
		);
	}

	renderItem() {
		if (!this.state.dataLoaded) {
			return <span />;
		}

		let commandItemsUpdater = extraItems => {
			this.setState({
				extraCommandItems: this._getNavFarItems(extraItems)
			});
		};

		switch (this.state.currentTab) {
			case 'Crew':
				return <CrewPage onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Items':
				return <ItemPage onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Equipment':
				return <EquipmentDetails />;

			case 'Ships':
				return <ShipList />;

			case 'Missions':
				return <MissionExplorer onCommandItemsUpdate={commandItemsUpdater} />;

			case 'Recommendations':
				return <CrewRecommendations />;

			case 'Voyage':
				return <VoyageTools />;

			case 'Gauntlet':
				return <GauntletHelper />;

			case 'Fleet':
				return <FleetDetails />;

			case 'About':
				return <AboutAndHelp />;

			case 'NeededEquipment':
				return <NeededEquipment onCommandItemsUpdate={commandItemsUpdater} />;

			case 'CrewDuplicates':
				return <CrewDuplicates onCommandItemsUpdate={commandItemsUpdater} />;

			case 'IncompleteMissions':
				return <IncompleteMissions onCommandItemsUpdate={commandItemsUpdater} />;


			default:
				return <span>Error! Unknown tab selected.</span>;
		}
	}

	_tabMenuItem(tab) {
		return {
			key: tab.key,
			name: tab.name || tab.key,
			iconProps: { iconName: tab.itemIcon },
			iconOnly: tab.iconOnly,
			onClick: () => {
				this._switchTab(tab.key);
			}
		}
	}

	_getNavOverflowItems() {
		let tabs = [
			{ key: 'Items', itemIcon: 'Boards' },
			{ key: 'Equipment', itemIcon: 'CheckList' },
			{ key: 'Ships', itemIcon: 'Airplane' },
			{ key: 'Fleet', itemIcon: 'WindDirection' }];

		return tabs.map(tab => this._tabMenuItem(tab));
	}

	_switchTab(newTab) {
		if (this.state.currentTab === newTab) {
			// From the history listener, nothing to do here
			return;
		}

		this.setState({
			currentTab: newTab,
			extraCommandItems: this._getNavFarItems()
		}, () => {
			if (this.history.location.hash.substr(1) !== newTab) {
				this.history.push({ hash: newTab });
			}
		});
	}

	_getNavFarItems(extraItems) {
		let staticItems = [
			{
				key: 'SwitchTheme',
				name: 'Switch theme',
				iconProps: { iconName: 'Light' },
				iconOnly: true,
				onClick: () => {
					this.setState({ darkTheme: !this.state.darkTheme }, () => this._onSwitchTheme(true));
				}
			},
			{
				key: 'FeedbackHelp',
				name: 'Feedback and help',
				iconProps: { iconName: 'Help' },
				iconOnly: true,
				subMenuProps: {
					items: [this._tabMenuItem({ key: 'About', name: 'Help and About', itemIcon: 'Help', iconOnly: true }),
					{
						key: 'ReportBug',
						name: 'Report bug...',
						iconProps: { iconName: 'Bug' },
						onClick: () => {
							createIssue(false);
						}
					},
					{
						key: 'SendFeedback',
						name: 'Feature request...',
						iconProps: { iconName: 'Comment' },
						onClick: () => {
							createIssue(true);
						}
					},
					{
						key: 'BuyCoffee',
						name: 'Buy me a coffee...',
						iconProps: { iconName: 'CoffeeScript' },
						onClick: () => {
							openShellExternal("https://www.buymeacoffee.com/Evbkf8yRT");
						}
					},
					{
						key: 'EmailMe',
						name: 'info@iampicard.com',
						iconProps: { iconName: 'Mail' },
						onClick: () => {
							openShellExternal("mailto:info@iampicard.com");
						}
					}
				]}
			}
		];

		return extraItems ? extraItems.concat(staticItems) : staticItems;
	}

	renderCaptainName() {
		return <div style={{ height: '100%' }}>
			<div style={{ cursor: 'pointer', display: 'flex', height: '100%', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }} onClick={this._onCaptainClicked} ref={this._captainButtonElement}>
				<Image src={this.state.captainAvatarUrl} height={32} style={{ display: 'inline-block' }} />
				<span style={{ padding: '5px' }}>{this.state.captainName}</span>
			</div>
			<Callout className='CaptainCard-callout'
				role={'alertdialog'}
				gapSpace={0}
				target={this._captainButtonElement.value}
				onDismiss={this._onCaptainCalloutDismiss}
				setInitialFocus={true}
				hidden={!this.state.isCaptainCalloutVisible}
			>
				<CaptainCard captainAvatarBodyUrl={this.state.captainAvatarBodyUrl} onLogout={this._onLogout} onRefresh={this._onRefresh} />
			</Callout>
		</div>;
	}

	renderMotd() {
		if (this.state.motd.show) {
			return <div style={{ cursor: 'pointer', display: 'flex', padding: '5px', height: '100%', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center' }}>
				<TooltipHost calloutProps={{ gapSpace: 20 }} delay={TooltipDelay.zero} directionalHint={DirectionalHint.bottomCenter}
					tooltipProps={{
						onRenderContent: () => {
							return (<div dangerouslySetInnerHTML={{ __html: this.state.motd.contents }} />);
						}
					}} >
					<span className={ColorClassNames.orangeLighter} dangerouslySetInnerHTML={{ __html: this.state.motd.title }} />
				</TooltipHost>
			</div>;
		} else {
			return <span />;
		}
	}

	_getNavItems() {
		let navItems = [
			{
				key: 'custom',
				text: 'Captain name',
				onRender: () => { return this.renderCaptainName(); }
			}];

		if (this.state.motd) {
			navItems.push({
				key: 'customMotd',
				text: 'Motd',
				onRender: () => { return this.renderMotd(); }
			});
		}

		if (this.state.updateUrl) {
			navItems.push({
				key: 'Update',
				name: 'New version available!',
				iconProps: { iconName: 'FlameSolid', styles: { root: { color: 'red' } } },
				iconOnly: true,
				onClick: () => {
					openShellExternal(this.state.updateUrl);
				}
			});
		}

		navItems = navItems.concat([
			this._tabMenuItem({ key: 'Crew', itemIcon: 'Teamwork' }),
			{
				key: 'tools',
				text: 'Tools and recommendations',
				iconProps: { iconName: 'TestUserSolid' },
				subMenuProps: {
					items: [this._tabMenuItem({ key: 'Missions', itemIcon: 'Trophy' }),
					{
						key: 'NeededEquipment',
						name: 'Needed Equipment',
						iconProps: { iconName: 'WaitlistConfirm' },
						onClick: () => {
							this._switchTab('NeededEquipment');
						}
					},
					{
						key: 'CrewDuplicates',
						name: 'Duplicate crew',
						iconProps: { iconName: 'MergeDuplicate' },
						onClick: () => {
							this._switchTab('CrewDuplicates');
						}
					},
					{
						key: 'IncompleteMissions',
						name: 'Incomplete missions',
						iconProps: { iconName: 'Backlog' },
						onClick: () => {
							this._switchTab('IncompleteMissions');
						}
					},
					{
						key: 'section',
						itemType: ContextualMenuItemType.Section,
						sectionProps: {
							topDivider: true,
							bottomDivider: true,
							title: 'Other recommendations',
							items: [
								{
									key: 'Recommendations',
									name: 'Minimal crew (OLD)',
									iconProps: { iconName: 'Lightbulb' },
									onClick: () => {
										this._switchTab('Recommendations');
									}
								}]
						}
					}]
				}
			},
			this._tabMenuItem({ key: 'Voyage', itemIcon: 'Rocket' }),
			this._tabMenuItem({ key: 'Gauntlet', itemIcon: 'ConnectContacts' })
		]);

		return navItems;
	}

	_onAccessToken() {
		this.setState({ showSpinner: true, showLoginDialog: false });

		loginSequence((progressLabel) => this.setState({ spinnerLabel: progressLabel }))
			.then(this._onDataFinished)
			.catch((err) => {
				this._onDataError(err);
			});
	}

	_onLogout() {
		this.setState({ isCaptainCalloutVisible: false, darkTheme: true }, () => { this._onSwitchTheme(true); });

		STTApi.refreshEverything(true);
		this.setState({ showLoginDialog: true, dataLoaded: false, captainName: 'Welcome!', spinnerLabel: 'Loading...' });
	}

	_onRefresh() {
		this.setState({ isCaptainCalloutVisible: false });
		STTApi.refreshEverything(false);
		this.setState({ dataLoaded: false, spinnerLabel: 'Refreshing...' });
		this._onAccessToken();
	}

	_onDataError(reason) {
		this.setState({ errorMessage: reason, hideErrorDialog: false });
	}

	async _onDataFinished() {
		// #!if ENV === 'electron'
		// This resets with every new version, in case the message is updated or folks forget
		let entry = await STTApi.config.where('key').equals('ui.showBootMessage' + getAppVersion()).first();
		let shouldShowBootMessage = !entry || entry.value;
		// #!else
		// TODO: This ifdef should be the same on web, but Safari crashes and burns with dexie indexeddb transactions (potentially Promise-related)
		let shouldShowBootMessage = false;
		// #!endif
		this.setState({
			showSpinner: false,
			captainName: STTApi.playerData.character.display_name,
			hideBootMessage: !shouldShowBootMessage,
			showBootMessage: shouldShowBootMessage,
			dataLoaded: true
		});

		// #!if ENV === 'electron'
		let data = await STTApi.getGithubReleases();
		let versions = data.map((release) => release.tag_name.replace('v', ''));
		let maxVersion = versions.sort(rcompare)[0];

		if (maxVersion != getAppVersion()) {
			var n = new Notification('STT Tool - Update available!', { body: 'A new release of the Star Trek Tool (' + data[0].tag_name + ' ' + data[0].name + ') has been made available. Please check the About tab for download instructions!' });
			this.setState({
				updateUrl: data[0].html_url
			});
		}
		// #!endif

		STTApi.networkHelper.get('https://iampicard.com/motd/get', { webApp: STTApi.inWebMode, dbid: STTApi.playerData.dbid, id: STTApi.playerData.character.id, version: getAppVersion() }).then((data) => {
			this.setState({ motd: data });
		});

		if (STTApi.playerData.character.crew_avatar) {
			STTApi.imageProvider.getCrewImageUrl(STTApi.playerData.character.crew_avatar, false, 0).then(({ id, url }) => {
				this.setState({ captainAvatarUrl: url });
			}).catch((error) => { this.setState({ captainAvatarUrl: '' }); });

			STTApi.imageProvider.getCrewImageUrl(STTApi.playerData.character.crew_avatar, true, 0).then(({ id, url }) => {
				this.setState({ captainAvatarBodyUrl: url });
			}).catch((error) => { this.setState({ captainAvatarBodyUrl: '' }); });
		}
	}
}

export default App;
