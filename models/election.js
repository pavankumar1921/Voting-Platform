'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static getElections(adminId) {
      return this.findAll({
        where:{
          adminId,
        },
        order:[["id","ASC"]]
      })
    }
    static addElection({elecName,publicurl,adminId}){
      return this.create({
        elecName,
        publicurl,
        adminId,
      })
    }
  
  static associate(models) {
    // define association here
    election.belongsTo(models.Admin, {
      foreignKey: "adminId",
    });
    election.hasMany(models.question,{
      foreignKey: "elecId"
    })
  }
}
  election.init({
    elecName: DataTypes.STRING,
    start: DataTypes.BOOLEAN,
    end: DataTypes.BOOLEAN,
    publicurl: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'election',
  });
  return election;
};