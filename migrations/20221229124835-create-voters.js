'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('voters', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      voterId: {
        type: Sequelize.STRING,
        unique:true,
      },
      voted: {
        type: Sequelize.BOOLEAN
      },
      case: {
        type: Sequelize.STRING,
        defaultValue:"voters",
      },
      password: {
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
    await queryInterface.addConstraint('voters', {
      fields: ["elecId"],
      type: "foreign key",
      references: {
        table: "elections",
        field: "id",
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('voters');
  }
};