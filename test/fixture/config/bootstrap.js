maintenanceSeed = [
  {
    id: "maintenance1",
    title: "Сайт временно не работает",
    description: "<div>\r\n<p>По техническим причинам доставка сейчас не осуществляется</p>\r\n</div>",
    enable: false,
    startDate: "2019-12-31T21:00:00.000Z",
    stopDate: "2020-12-31T21:00:00.000Z",
  },
];

const fs = require("fs");
const path = require("path");

module.exports.bootstrap = async function (cb) {
  sails.config.paths.app = process.cwd();

  /**
   * # Bootsrap seeds from seeds folder
   * Magic: filename.json where filename is model name
   */

  if (sails.config.models.migrate === "drop" || process.env.FORCE_SEED === "TRUE") {
    sails.log.info("Seeding 🌱 process start")
    try {
      let seedsDir = process.env.SEED_PATH ? process.env.SEED_PATH : __dirname + "/../seeds/";
      // load JSON data
      let seeds = fs.readdirSync(seedsDir).filter(function (file) {
        return path.extname(file).toLowerCase() === ".json";
      });

      for await (let seed of seeds) {
        try {
          let seedFile = seedsDir + seed;
          let model = seed.split(".")[0].toLowerCase();
          let json_seed_data = require(seedFile);

          sails.log.info("🌱 Bootstrap > Seed for model: ", model);

          if (sails.models[model]) {
            await sails.models[model].destroy({}).fetch();
            if (Array.isArray(json_seed_data)) {
              for await (seed_item of json_seed_data) {
                cleanSeedItem(seed_item);
                await sails.models[model].create(seed_item).fetch();
              }
              sails.log.debug(`🌱 Bootstrap seed ${model}: > count: ${json_seed_data.length}`);
            } else {
              sails.log.debug(`🌱 Bootstrap seed ${model}: > one item`);
              cleanSeedItem(seed_item);
              await sails.models[model].create(json_seed_data).fetch();
            }
            sails.log.info(`Bootstrap seed model: > ${model} was seeded, count: ${json_seed_data.length}`);
          } else {
            sails.log.warn(`Bootstrap seed model: > ${model} SKIPED (model not present in sails)`);
          }
        } catch (error) {
          sails.log.error(`🌱 Seeding error: ${error}`);
        }
      }

      // Load JS files
      seeds = fs.readdirSync(seedsDir).filter(function (file) {
        return path.extname(file).toLowerCase() === ".js";
      });

      /**
       * If file .queue exist then sort seedqueue by this file
       */

      if (fs.existsSync(seedsDir + ".queue")) {
        var queuelist = fs
            .readFileSync(seedsDir + ".queue")
            .toString()
            .split("\n");
        let _seeds = [...seeds];
        seeds = [];

        // Build head loadlist of js seeds files
        queuelist.forEach((qItem) => {
          _seeds.forEach((sItem) => {
            if (sItem.includes(qItem) && !isCommented(qItem)) {
              seeds.push(sItem);
            }
          });
        });

        // Build foot
        seeds = [...seeds, ..._seeds.filter((n) => !seeds.includes(n))];
      }

      for await (let seed of seeds) {
        let seedFile = seedsDir + seed;
        if (fs.existsSync(seedFile)) {
          let bootstrap_model_seed = require(seedFile);
          await bootstrap_model_seed.default(sails);
        }
      }
    } catch (error) {
      console.error("Bootstrap seeds error: > ", error);
    }
  }

  await Settings.set("enableIikoSimpleDiscounts", true);
  //////////////////////////////////////////////////////////

  setTimeout(() => {
    console.log("ADMINPANEL", sails.config.adminpanel.instances.discount)
  }, 10000)

  if (sails.config.models.migrate === "drop") {
    try {
      if ((await Maintenance.count()) === 0) {
        sails.log.verbose("BOOTSTRAP > Start Import Maintenance SEED");
        await Maintenance.createEach(maintenanceSeed).fetch();
      }

      process.env.TZ = (await Settings.use("timezone")) ? await Settings.use("timezone") : process.env.TZ;

      cb();
    } catch (error) {
      console.log(error);
    }
  } else {
    process.env.TZ = (await Settings.use("timezone")) ? await Settings.use("timezone") : process.env.TZ;
    cb();
  }
  cb();
};

function isCommented(str) {
  return (Boolean(str) && (
      str
          .split(" ")
          .filter((a) => {
            return Boolean(a);
          })[0]
          .charAt(0) === "#"
  ));
}


function cleanSeedItem(item) {

  if(item.createdAt) delete(item.createdAt)
  if(item.updatedAt) delete(item.updatedAt)
  if(typeof item.id === "number") delete(item.id)

  for (const [key, value] of Object.entries(item)) {
    if (value === null || value === undefined)  {
      delete(item[key])
    } else {
      try {
        let json_value = JSON.parse(value);
        item[key] = json_value
      } catch (e) {
      }
    }
  }
}
