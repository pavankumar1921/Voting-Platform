'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('questions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      questionName: {
        type: Sequelize.STRING,
        allowNull:false,
      },
      desc: {
        type: Sequelize.STRING
      },
      elecId: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addConstraint("questions",{
      fields: ["elecId"],
      type: "foreign key",
      references:{
        table:"elections",
        field: "id",
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('questions');
  }
};