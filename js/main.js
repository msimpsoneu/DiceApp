$(function () {

// localStorage namespace
var storedRolls = new Backbone.LocalStorage("StoredRolls");

// Models
var DiceRoll = Backbone.Model.extend({
	defaults: {"qty": 1,"d": 6,"symbol": "plus","modifier": 0}
});

var StoredRoll = Backbone.Model.extend({
	defaults: function() {
		var diceRoll = new DiceRoll;
		return {
			"Name": "new roll",
			"DiceRoll": diceRoll.toJSON()
		};
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
		"click a[href='#roll-edit']":"editClicked"
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
		this.rollid = $(event.currentTarget).closest(".ui-grid-b").attr("data-selectedroll");

		// get the H1 that displays the result
		this.result = $(event.currentTarget).closest(".ui-bar").prev().find("h1");

		// set the model as the DiceRoll, not the the StoredRoll itself 
		this.model = StoredRolls.getByRollId(this.rollid).attributes.DiceRoll;

		// roll the dice and +/- the modifers
		this.rollResult = this.roll(this.model);

		// display the roll and the resulting total e.g. 2 D6 + 4 = 6
		$(this.result).html(this.model.qty + "D" + this.model.d + " " + this.model.symbol + " " + this.model.modifier + " = " + this.rollResult);
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
		$('.dnd-roll-result').find("h1").html("1D" + this.d + " = " + Math.floor((Math.random()*this.d)+1));
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
			"d": $("[name='radio-d']:checked").val(), 
			"symbol": $("[name='radio-symbol']:checked").val(), 
			"modifier": $("[name='txt-modifier']").val(), 
		});

		// populate and save the model
		this.model.save({"Name": $("[name='txt-name']").val(), "DiceRoll": this.diceRoll.toJSON(), "id": this.model.id});
	},

	// refresh form values
	refreshForm: function() {
		$("[name='txt-name']").textinput("refresh");
		$("[name='txt-qty']").textinput("refresh");
		$("[name='txt-modifier']").textinput("refresh");
		$("[name='radio-d']:checked").checkboxradio("refresh");
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
		"deleted":"home"
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
		this.rollid = $("[data-edit='clicked']").closest(".ui-grid-b").attr("data-selectedroll");

		// get the model
		this.model = StoredRolls.getByRollId(this.rollid);

		// change the page
		this.changePage(new RollDetailsView({model: this.model}));
	},

	deleteRoll: function() {
		console.log('#delete');

		// delete page is a dialog
		this.dialog = true;

		// get roll id
		this.rollid = $("[data-delete='clicked']").closest(".ui-grid-b").attr("data-selectedroll");

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