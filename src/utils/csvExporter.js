import STTApi from 'sttapi-frontend';

import { parse as json2csv } from 'json2csv';

// In plain browsers, to avoid using fs, we could do something like this: https://stackoverflow.com/a/18197511
export function exportCsv() {
	var fields = ['id', 'name', 'short_name', 'max_rarity', 'rarity', 'level', 'frozen', 'buyback', 'command_skill.core', 'command_skill.min', 'command_skill.max', 'diplomacy_skill.core',
		'diplomacy_skill.min', 'diplomacy_skill.max', 'engineering_skill.core', 'engineering_skill.min', 'engineering_skill.max', 'medicine_skill.core', 'medicine_skill.min', 'medicine_skill.max',
		'science_skill.core', 'science_skill.min', 'science_skill.max', 'security_skill.core', 'security_skill.min', 'security_skill.max', 'traits',
		'ship_battle.accuracy', 'ship_battle.crit_bonus', 'ship_battle.crit_chance', 'ship_battle.evasion', 'action.name', 'action.bonus_amount', 'action.bonus_type', 'action.duration', 'action.cooldown', 'action.initial_cooldown', 'action.limit',
		'action.penalty.type', 'action.penalty.amount', 'action.charge_phases',
		'action.ability.condition', 'action.ability.type', 'action.ability.amount'];

	return json2csv(STTApi.roster, { fields });
}

export function exportItemsCsv() {
	var fields = ['name', 'rarity', 'quantity', 'typeName', 'symbol', 'flavor'];

	return json2csv(STTApi.playerData.character.items, { fields });
}
