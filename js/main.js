$(function () {

// localStorage namespace
var storedRolls = new Backbone.LocalStorage("StoredRolls");

// Models
var DiceRoll = Backbone.Model.extend({
	defaults: {"qty": "","d": "","symbol": "plus","modifier": ""}
});

var StoredRoll = Backbone.Model.extend({

	defaults: function() {
		var diceRoll = new DiceRoll;
		diceRoll = diceRoll.toJSON();
		return {
			"Name": "",
			"DiceRoll": diceRoll,
			"DiceRollText": this.diceRollText(diceRoll)
		};
	},

	diceRollText: function(diceRoll) {
		return diceRoll.qty + " D" + diceRoll.d + (diceRoll.modifier != 0 ? " " + diceRoll.symbol + " " + diceRoll.modifier : "");
	},

	// reference so changes to model are reflected in localStorage
	localStorage: storedRolls
});

// Collections
var StoredRollsCollection = Backbone.Collection.extend({
	model: StoredRoll,

	// reference again so that any changes are reflected
	localStorage: storedRolls,

	// gets the StoredRoll instance by id
	getByRollId: function(id) {
		console.log("id: " + id);
		return this.where({"id":id})[0];
	}
});

var StoredRolls = new StoredRollsCollection;

// Views
window.HomeView = Backbone.View.extend({
	template: _.template($('#home').html()),

	events: {
		"click a[href='#delete']":"deleteClicked",
		"click a[href='#roll']":"rollClicked",
		"click a[href='#roll-edit']":"editClicked",
		"click a[id='btn-popup']":"menuPopupClicked"
	},

	initialize: function() {
		// so the function can reference the view
		var self = this;
		this.collection = StoredRolls;
		this.collection.fetch().done(function() {self.render();});
		
	},

	render: function(event) {
		// JSONify the collection and use it with the template
		this.$el.html(this.template({collection: this.collection.toJSON()}));
		return this;
	},

	menuPopupClicked: function(event) {
		var menu = $(event.target.attributes[0].value);
		menu.popup();
		menu.popup("open", { positionTo: event.target });
	},

	editClicked: function(event) {
		// remove existing 'clicked' if one exists
		$("[data-edit='clicked']").attr("data-edit","");

		// assign new 'clicked'
		$(event.target).attr("data-edit","clicked");
	},

	deleteClicked: function(event) {
		// remove existing 'clicked' if one exists
		$("[data-delete='clicked']").attr("data-delete","");

		// assign new 'clicked'
		$(event.target).attr("data-delete","clicked");
	},

	rollClicked: function(event) {
		// get clicked rolls id from its parent
		var parent = event.target;
		this.rollid = $(parent).closest("li").attr("data-selectedroll");

		// set the model as the DiceRoll, not the the StoredRoll itself 
		this.model = StoredRolls.getByRollId(this.rollid).attributes.DiceRoll;

		// roll the dice and +/- the modifers
		this.rollResult = this.roll(this.model);

		// display the roll and the resulting total e.g. 2 D6 + 4 = 6
		$(parent.firstElementChild).html(this.rollResult);
	},

	roll: function(roll) {
		var total = 0;
		
		// roll dice equal to qty
		for(var i = 0;i<roll.qty;i++)
		{
			// roll a single die of d sides
			var die = Math.floor((Math.random()*roll.d)+1);

			console.log("1D" + roll.d + " = " + die);

			// add result to total
			total = total + die;
		}

		// +/- modifiers
		if (roll.symbol=="plus") {
			console.log(total + " + " + roll.modifier);
			return parseInt(total) + parseInt(roll.modifier);
		}
		else if (roll.symbol=="minus") {
			console.log(total + " - " + roll.modifier);
			return parseInt(total) - parseInt(roll.modifier);
		}
	}
});

window.AboutView =  Backbone.View.extend({
	template: _.template($('#about').html()),

	render: function(event) {
		this.$el.html(this.template);
		return this;
	}
});

window.DeleteRollView = Backbone.View.extend({
	events:{
		"click a[href='#deleted']":"deletedClicked"
	},

	template: _.template($('#delete-roll').html()),

	render: function(event) {
		this.$el.html(this.template);
		return this;
	},

	deletedClicked: function(event) {
		// delete model instance
		this.model.destroy();
	}
});

window.QuickRollView = Backbone.View.extend({
	events: {
		"click .ui-btn": "roll"
	},

	template: _.template($('#quick-roll').html()),

	render: function(event) {
		this.$el.html(this.template);
		return this;
	},

	roll: function(event) {
		// get the d value of the button
		this.d = event.target.dataset.d;
		console.log("D" + this.d);

		// roll a single die of d sides
		$(event.target.firstElementChild).html(Math.floor((Math.random()*this.d)+1));
	}
});

window.RollDetailsView = Backbone.View.extend({
	events: {
		"click a.save":"saveRoll",
		"click .ui-radio":"checked"
	},

	template: _.template($('#roll-details').html()),

	render: function(event) {
		this.$el.html(this.template(this.model.toJSON()));
		return this;
	},

	saveRoll: function() {
		// refresh the form controls
		this.refreshForm();

		// populate the DiceRoll
		this.diceRoll = new DiceRoll({ 
			"qty": $("[name='txt-qty']").val(), 
			"d": $("[name='select-dice']").val(), 
			"symbol": $("[name='radio-symbol']:checked").val(), 
			"modifier": $("[name='txt-modifier']").val(), 
		});

		// JSONify the DiceRoll
		this.diceRoll = this.diceRoll.toJSON();

		// populate and save the model
		this.model.save({"Name": $("[name='txt-name']").val(), "DiceRoll": this.diceRoll, "DiceRollText": this.model.diceRollText(this.diceRoll), "id": this.model.id});
	},

	// refresh form values
	refreshForm: function() {
		var txtName = $("[name='txt-name']");
		var txtQty = $("[name='txt-qty']");
		var txtModifier = $("[name='txt-modifier']");

		// check for empty textboxes
		if(txtName.val() == "") {
			txtName.val("new roll");
		}

		if(txtQty.val() == "" || txtQty.val() == "0") {
			txtQty.val("1");
		}

		if(txtModifier.val() == "") {
			txtModifier.val("0");
		}

		// refresh the inputs
		txtName.textinput("refresh");
		txtQty.textinput("refresh");
		txtModifier.textinput("refresh");
		$("[name='radio-symbol']").checkboxradio("refresh");
	},

	// checkbox value handling
	checked: function(event) {
		// delete the existing selected
		$(event.currentTarget.parentNode.childNodes).find("input:checked").attr("checked", false);

		// assign the new one
		$(event.currentTarget).find("input").attr("checked", true);
    }
});

// Routers
var AppRouter = Backbone.Router.extend({
	routes:{
		"":"home",
		"quick-roll":"quickRoll",
		"roll-edit":"rollEdit",
		"roll-new":"rollNew",
		"delete":"deleteRoll",
		"deleted":"home",
		"about":"about",
	},

	initialize: function () {
		// Handle back button throughout the application
		$('.back').on('click', function(event) {
			window.history.back();
			return false;
		});
		this.firstPage = true;
		this.dialog = false;
	},

	home: function() {
		console.log('#home');

		// change the page
		this.changePage(new HomeView());
	},

	quickRoll: function() {
		console.log('#quick-roll');

		// change the page
		this.changePage(new QuickRollView());
	},

	rollNew: function() {
		console.log('#roll-details');

		// get the model
		this.model = new StoredRoll;

		// change the page
		this.changePage(new RollDetailsView({model: this.model}));
	},

	rollEdit: function() {
		console.log('#roll-details');

		// get roll id
		this.rollid = $("[data-edit='clicked']").closest("div[data-selectedroll]").attr("data-selectedroll");

		// get the model
		this.model = StoredRolls.getByRollId(this.rollid);

		// change the page
		this.changePage(new RollDetailsView({model: this.model}));
	},

	about: function() {
		console.log("#about");

		// is dialog
		this.dialog = true;

		// change the page
		this.changePage(new AboutView());
	},

	deleteRoll: function() {
		console.log('#delete');

		// delete page is a dialog
		this.dialog = true;

		// get roll id
		this.rollid = $("[data-delete='clicked']").closest("div[data-selectedroll]").attr("data-selectedroll");

		// get the model
		this.model = StoredRolls.getByRollId(this.rollid);

		// change the page
		this.changePage(new DeleteRollView({model: this.model}));
	},

	changePage: function(page) {
		// set page transition
		var transition = $.mobile.defaultPageTransition;

		// is dialog?
		$(page.el).attr("data-dialog", this.dialog);

		// if it is change the transition appropriately and reset the dialog property
		if (this.dialog) {
			transition = "pop";
			this.dialog = false;
		}

		// render the page and attach it to the body
		$(page.el).attr('data-role', 'page');
		page.render();
		$('body').html($(page.el));

		// No transition on first page
		if(this.firstPage) {
			transition = "none";
			this.firstPage = false;
		}

		// change the page with the transition
		$.mobile.changePage($(page.el), {changeHash:false, transition: transition});
	}
});

console.log('document ready');
// initialize app
app = new AppRouter();
Backbone.history.start();

});