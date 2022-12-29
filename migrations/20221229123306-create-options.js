'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('options', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      optionName: {
        type: Sequelize.STRING
      },
      questionId: {
        onDelete:"CASCADE",
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
    });
    await queryInterface.addConstraint("options",{
      fields: ["questionId"],
      type: "foreign key",
      onDelete:"CASCADE",
      references:{
        table:"questions",
        field: "id",
      }
    })
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('options');
  }
};